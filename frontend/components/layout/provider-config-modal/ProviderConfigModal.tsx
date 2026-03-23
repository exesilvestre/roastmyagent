"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOllamaHealth } from "@/lib/api/llmProviders";
import { appToast } from "@/lib/app-toast";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import type { CloudLlmProviderId } from "@/lib/types/llm-provider";
import { CLOUD_PROVIDER_ORDER, DEFAULT_OLLAMA_MODEL } from "./constants";
import { ActiveBanner } from "./ActiveBanner";
import { Cloud } from "./Cloud";
import { Footer } from "./Footer";
import { Local } from "./Local";
import type {
  BusyState,
  ProviderConfigModalProps,
  ProviderModalErrors,
  UpdateTarget,
} from "./types";
import "./styles.css";

function isFooterBusy(busy: BusyState): boolean {
  return busy !== "idle";
}

/** Test connection (no save): disabled while saving or pinging */
function isTestConnectionDisabled(busy: BusyState): boolean {
  return (
    busy === "savingCloud" ||
    busy === "savingLocal" ||
    busy === "activatingLocal" ||
    busy === "checkingPing"
  );
}

/** Help panel retry: disabled whenever any blocking work runs */
function isHelpRetryDisabled(busy: BusyState): boolean {
  return busy !== "idle";
}

export function ProviderConfigModal({ open, onClose }: ProviderConfigModalProps) {
  const providers = useLlmProviderStore((s) => s.providers);
  const loading = useLlmProviderStore((s) => s.loading);
  const fetchProviders = useLlmProviderStore((s) => s.fetchProviders);
  const patchProvider = useLlmProviderStore((s) => s.patchProvider);
  const activateProvider = useLlmProviderStore((s) => s.activateProvider);

  const [selectedId, setSelectedId] = useState<CloudLlmProviderId>("openai");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [ollamaModelDraft, setOllamaModelDraft] = useState(DEFAULT_OLLAMA_MODEL);
  const [errors, setErrors] = useState<ProviderModalErrors>({});
  const [busyState, setBusyState] = useState<BusyState>("idle");
  const [localHelpVisible, setLocalHelpVisible] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<UpdateTarget>("cloud");

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetchProviders().catch(() => {});
  }, [open, fetchProviders]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const active = providers.find((p) => p.isActive);
    if (active && CLOUD_PROVIDER_ORDER.includes(active.id as CloudLlmProviderId)) {
      setSelectedId(active.id as CloudLlmProviderId);
    }
    setUpdateTarget(active?.id === "ollama" ? "local" : "cloud");
  }, [open, providers]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const p = providers.find((x) => x.id === selectedId);
    setModelDraft(p?.model ?? "");
    setApiKeyDraft("");
    setErrors((e) => ({ ...e, cloud: undefined, localSave: undefined }));
  }, [open, selectedId, providers]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const row = providers.find((x) => x.id === "ollama");
    setOllamaModelDraft(row?.model?.trim() ? row.model : DEFAULT_OLLAMA_MODEL);
  }, [open, providers]);

  useEffect(() => {
    if (!open) {
      setLocalHelpVisible(false);
      setErrors((e) => ({ ...e, localConnect: undefined }));
    }
  }, [open]);

  const provider = providers.find((x) => x.id === selectedId);
  const active = providers.find((p) => p.isActive);
  const isOllamaActive = active?.id === "ollama";

  const providerSelectOptions = useMemo(
    () =>
      CLOUD_PROVIDER_ORDER.map((id) => ({
        id,
        label: providers.find((p) => p.id === id)?.label ?? id,
      })),
    [providers],
  );

  const isCurrentCloud = provider?.isActive ?? false;

  const footerButtonLabel =
    busyState === "savingCloud" || busyState === "savingLocal" || busyState === "activatingLocal"
      ? updateTarget === "cloud"
        ? "Updating cloud…"
        : "Updating local…"
      : updateTarget === "cloud"
        ? "Update cloud provider"
        : isOllamaActive
          ? "Update local (Ollama)"
          : "Activate local (Ollama)";

  const saveCloudProvider = useCallback(async () => {
    setBusyState("savingCloud");
    try {
      const patch: { apiKey?: string; model?: string } = { model: modelDraft };
      if (apiKeyDraft.trim() !== "") {
        patch.apiKey = apiKeyDraft;
      }
      await patchProvider(selectedId, patch);
      await activateProvider(selectedId);
      appToast.success("Cloud provider updated and active.");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErrors({ cloud: msg });
      appToast.error(msg);
    } finally {
      setBusyState("idle");
    }
  }, [activateProvider, apiKeyDraft, modelDraft, onClose, patchProvider, selectedId]);

  const saveActiveLocalProvider = useCallback(async () => {
    setBusyState("savingLocal");
    try {
      await patchProvider("ollama", { model: ollamaModelDraft });
      await activateProvider("ollama");
      const verify = await fetchOllamaHealth();
      await fetchProviders();
      if (verify.ok) {
        appToast.success(`Model "${ollamaModelDraft.trim()}" saved, Ollama responded OK.`);
      } else {
        appToast.error(
          "Model saved, but Ollama did not respond to a check, verify OLLAMA_BASE_URL.",
        );
      }
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErrors({ localSave: msg });
      appToast.error(msg);
    } finally {
      setBusyState("idle");
    }
  }, [activateProvider, fetchProviders, ollamaModelDraft, onClose, patchProvider]);

  const activateLocalFromCloudOrNone = useCallback(async () => {
    setLocalHelpVisible(false);
    setBusyState("activatingLocal");
    try {
      const health = await fetchOllamaHealth();
      if (!health.ok) {
        setLocalHelpVisible(true);
        appToast.error("Could not reach Ollama, check it is running and OLLAMA_BASE_URL.");
        return;
      }
      const model = ollamaModelDraft.trim() || DEFAULT_OLLAMA_MODEL;
      await patchProvider("ollama", { model });
      await activateProvider("ollama");
      const verify = await fetchOllamaHealth();
      await fetchProviders();
      if (verify.ok) {
        appToast.success(`Using Ollama · model ${model}, API responded OK.`);
      } else {
        appToast.error(
          "Ollama was activated but a follow-up check failed, verify OLLAMA_BASE_URL.",
        );
      }
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Local setup failed";
      setErrors({ localConnect: msg });
      appToast.error(msg);
    } finally {
      setBusyState("idle");
    }
  }, [activateProvider, fetchProviders, ollamaModelDraft, onClose, patchProvider]);

  const runUnifiedUpdate = useCallback(async () => {
    clearErrors();

    if (updateTarget === "cloud") {
      await saveCloudProvider();
      return;
    }

    if (isOllamaActive) {
      await saveActiveLocalProvider();
      return;
    }

    await activateLocalFromCloudOrNone();
  }, [
    activateLocalFromCloudOrNone,
    clearErrors,
    isOllamaActive,
    saveActiveLocalProvider,
    saveCloudProvider,
    updateTarget,
  ]);

  const handleTestConnection = useCallback(() => {
    setBusyState("checkingPing");
    void (async () => {
      try {
        const h = await fetchOllamaHealth();
        if (h.ok) {
          appToast.success("Ollama API responded, connection OK.");
        } else {
          appToast.error("Ollama did not respond, check it is running and URL settings.");
        }
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : "Check failed");
      } finally {
        setBusyState("idle");
      }
    })();
  }, []);

  const handleRetryHelpCheck = useCallback(() => {
    setBusyState("checkingHelpRetry");
    void (async () => {
      try {
        const h = await fetchOllamaHealth();
        if (h.ok) {
          setLocalHelpVisible(false);
          appToast.success("Ollama responded, try Update local again.");
        } else {
          appToast.error("Still can't reach Ollama.");
        }
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : "Check failed");
      } finally {
        setBusyState("idle");
      }
    })();
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="providerModal_overlay" role="presentation" onClick={onClose}>
      <section
        className="providerModal"
        role="dialog"
        aria-modal="true"
        aria-label="LLM settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="providerModal_top">
          <div className="providerModal_header">
            <h2 className="providerModal_title">LLM settings</h2>
          </div>
          <p className="providerModal_hint">
            Keys are sent to this app&apos;s backend and encrypted at rest (Fernet). One provider
            can be active at a time.
          </p>
        </div>

        <div className="providerModal_body">
          <ActiveBanner
            activeLabel={active?.label ?? null}
            activeModel={active?.model?.trim() ? active.model : null}
          />

          <div className="providerModal_columnsScroll">
            <div className="providerModal_columns">
              <Cloud
                focused={updateTarget === "cloud"}
                onColumnClick={() => setUpdateTarget("cloud")}
                isOllamaActive={isOllamaActive}
                isCurrentCloud={isCurrentCloud}
                loading={loading}
                providersEmpty={providers.length === 0}
                selectedId={selectedId}
                onSelectedIdChange={(id) => {
                  setSelectedId(id);
                  setErrors((e) => ({ ...e, cloud: undefined }));
                }}
                providerSelectOptions={providerSelectOptions}
                apiKeyDraft={apiKeyDraft}
                modelDraft={modelDraft}
                onApiKeyDraftChange={setApiKeyDraft}
                onModelDraftChange={setModelDraft}
                onCloudFieldFocus={() => setUpdateTarget("cloud")}
                cloudError={errors.cloud}
                providerHasApiKey={Boolean(provider?.hasApiKey)}
              />

              <Local
                focused={updateTarget === "local"}
                onColumnClick={() => setUpdateTarget("local")}
                isOllamaActive={isOllamaActive}
                ollamaModelDraft={ollamaModelDraft}
                onOllamaModelDraftChange={setOllamaModelDraft}
                onLocalFieldFocus={() => setUpdateTarget("local")}
                localSaveError={errors.localSave}
                localConnectError={errors.localConnect}
                localHelpVisible={localHelpVisible}
                testDisabled={isTestConnectionDisabled(busyState)}
                testBusy={busyState === "checkingPing"}
                onTestConnection={handleTestConnection}
                retryDisabled={isHelpRetryDisabled(busyState)}
                retryBusy={busyState === "checkingHelpRetry"}
                onRetryHelpCheck={handleRetryHelpCheck}
              />
            </div>
          </div>

          <Footer
            updateTarget={updateTarget}
            onUpdateTargetChange={setUpdateTarget}
            buttonLabel={footerButtonLabel}
            footerDisabled={isFooterBusy(busyState)}
            onPrimaryAction={runUnifiedUpdate}
          />
        </div>
      </section>
    </div>
  );
}


// review