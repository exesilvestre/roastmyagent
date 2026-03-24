"use client";

import { useEffect, useMemo, useState } from "react";
import { ProviderSelect } from "@/components/common/ProviderSelect";
import { fetchOllamaHealth } from "@/lib/api/llmProviders";
import { appToast } from "@/lib/app-toast";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import type { CloudLlmProviderId } from "@/lib/types/llm-provider";
import type { ProviderConfigModalProps } from "./types";
import "./styles.css";

const CLOUD_PROVIDER_ORDER: CloudLlmProviderId[] = ["openai", "anthropic", "gemini"];
const DEFAULT_OLLAMA_MODEL = "llama3";

type UpdateTarget = "cloud" | "local";

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ollamaSaveError, setOllamaSaveError] = useState<string | null>(null);
  const [localCtaError, setLocalCtaError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localConnecting, setLocalConnecting] = useState(false);
  const [ollamaPingBusy, setOllamaPingBusy] = useState(false);
  const [localHelpVisible, setLocalHelpVisible] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<UpdateTarget>("cloud");

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
    setSaveError(null);
    setOllamaSaveError(null);
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
      setLocalCtaError(null);
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

  const footerHint =
    updateTarget === "cloud"
      ? "Applies to the Cloud column: saves key & model and activates that vendor."
      : isOllamaActive
        ? "Applies to the Local column: saves the Ollama model name and verifies the API."
        : "Applies to the Local column: checks Ollama, then activates local AI with the model below.";

  const footerButtonLabel =
    saving || localConnecting
      ? updateTarget === "cloud"
        ? "Updating cloud…"
        : "Updating local…"
      : updateTarget === "cloud"
        ? "Update cloud provider"
        : isOllamaActive
          ? "Update local (Ollama)"
          : "Activate local (Ollama)";

  async function runUnifiedUpdate() {
    setSaveError(null);
    setOllamaSaveError(null);
    setLocalCtaError(null);

    if (updateTarget === "cloud") {
      setSaving(true);
      try {
        const patch: { apiKey?: string; model?: string } = { model: modelDraft };
        if (apiKeyDraft.trim() !== "") {
          patch.apiKey = apiKeyDraft;
        }
        await patchProvider(selectedId, patch);
        const ok = await activateProvider(selectedId);
        if (!ok) {
          setSaveError(
            "Could not activate. Set model and API key (backend must have FERNET_KEY).",
          );
          return;
        }
        appToast.success("Cloud provider updated and active.");
        onClose();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Save failed");
        appToast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Local
    if (isOllamaActive) {
      setSaving(true);
      try {
        await patchProvider("ollama", { model: ollamaModelDraft });
        const ok = await activateProvider("ollama");
        if (!ok) {
          setOllamaSaveError("Could not save. Ensure model is set and Ollama is reachable.");
          return;
        }
        const verify = await fetchOllamaHealth();
        await fetchProviders();
        if (verify.ok) {
          appToast.success(`Model "${ollamaModelDraft.trim()}" saved — Ollama responded OK.`);
        } else {
          appToast.error(
            "Model saved, but Ollama did not respond to a check — verify OLLAMA_BASE_URL.",
          );
        }
        onClose();
      } catch (e) {
        setOllamaSaveError(e instanceof Error ? e.message : "Save failed");
        appToast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Activate local from cloud / none
    setLocalHelpVisible(false);
    setLocalConnecting(true);
    try {
      const health = await fetchOllamaHealth();
      if (!health.ok) {
        setLocalHelpVisible(true);
        appToast.error("Could not reach Ollama — check it is running and OLLAMA_BASE_URL.");
        return;
      }
      const model = ollamaModelDraft.trim() || DEFAULT_OLLAMA_MODEL;
      await patchProvider("ollama", { model });
      const ok = await activateProvider("ollama");
      if (!ok) {
        setLocalCtaError(
          "Could not activate local provider. Set OLLAMA_BASE_URL if the API runs in Docker.",
        );
        return;
      }
      const verify = await fetchOllamaHealth();
      await fetchProviders();
      if (verify.ok) {
        appToast.success(`Using Ollama · model ${model} — API responded OK.`);
      } else {
        appToast.error(
          "Ollama was activated but a follow-up check failed — verify OLLAMA_BASE_URL.",
        );
      }
      onClose();
    } catch (e) {
      setLocalCtaError(e instanceof Error ? e.message : "Local setup failed");
      appToast.error(e instanceof Error ? e.message : "Local setup failed");
    } finally {
      setLocalConnecting(false);
    }
  }

  if (!open) {
    return null;
  }

  const activeSummary =
    active != null ? (
      <div className="providerModal_activeBanner" role="status">
        <span className="providerModal_activeLabel">Active now</span>
        <span className="providerModal_activeValue">
          {active.label}
          {active.model ? (
            <>
              {" "}
              · <span className="providerModal_activeModel">{active.model}</span>
            </>
          ) : null}
        </span>
      </div>
    ) : (
      <div className="providerModal_activeBanner providerModal_activeBanner_muted" role="status">
        <span className="providerModal_activeLabel">Active now</span>
        <span className="providerModal_activeValue">None — update cloud or local below</span>
      </div>
    );

  const footerBusy = saving || localConnecting;

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
          {activeSummary}

          <div className="providerModal_columnsScroll">
            <div className="providerModal_columns">
              <div
                className={`providerModal_col providerModal_colCloud ${updateTarget === "cloud" ? "providerModal_colFocused" : ""}`}
                onClick={() => setUpdateTarget("cloud")}
                role="presentation"
              >
              <div className="providerModal_colHead">
                <h3 className="providerModal_colTitle">Cloud API</h3>
                {!isOllamaActive && isCurrentCloud ? (
                  <span className="providerModal_badge">In use</span>
                ) : null}
              </div>
              <p className="providerModal_colHint">
                OpenAI, Anthropic, or Gemini. Pick vendor, paste key, set model.
              </p>
              <details className="providerModal_details providerModal_detailsInline">
                <summary>Gemini free tier</summary>
                <div className="providerModal_detailsBody">
                  <p>
                    Key from{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google AI Studio
                    </a>
                    .
                  </p>
                </div>
              </details>
              <label
                className="providerModal_label providerModal_labelSelect"
                onFocus={() => setUpdateTarget("cloud")}
              >
                Provider
                <ProviderSelect
                  value={selectedId}
                  onChange={(id) => {
                    setSelectedId(id as CloudLlmProviderId);
                    setSaveError(null);
                  }}
                  options={providerSelectOptions}
                  disabled={loading && providers.length === 0}
                  ariaLabel="Cloud LLM provider"
                />
              </label>
              {loading && providers.length === 0 ? (
                <p className="providerModal_hint">Loading…</p>
              ) : (
                <>
                  <label className="providerModal_label">
                    API key
                    <input
                      className="providerModal_input"
                      type="password"
                      value={apiKeyDraft}
                      onChange={(event) => setApiKeyDraft(event.target.value)}
                      onFocus={() => setUpdateTarget("cloud")}
                      placeholder={
                        provider?.hasApiKey ? "Leave blank to keep stored key" : "API key"
                      }
                      autoComplete="off"
                    />
                  </label>
                  <label className="providerModal_label">
                    Model
                    <input
                      className="providerModal_input"
                      type="text"
                      value={modelDraft}
                      onChange={(event) => setModelDraft(event.target.value)}
                      onFocus={() => setUpdateTarget("cloud")}
                      placeholder="Model id"
                    />
                  </label>
                  {saveError ? <p className="providerModal_error">{saveError}</p> : null}
                </>
              )}
            </div>

            <div
              className={`providerModal_col providerModal_colLocal ${updateTarget === "local" ? "providerModal_colFocused" : ""}`}
              onClick={() => setUpdateTarget("local")}
              role="presentation"
            >
              <div className="providerModal_colHead">
                <h3 className="providerModal_colTitle">Local (Ollama)</h3>
                {isOllamaActive ? <span className="providerModal_badge">In use</span> : null}
              </div>
              <p className="providerModal_colHint">
                Models on this machine. No cloud API key stored for Ollama.
              </p>

              <label className="providerModal_label">
                {isOllamaActive ? "Model" : "Model (when activating local)"}
                <input
                  className="providerModal_input"
                  type="text"
                  value={ollamaModelDraft}
                  onChange={(event) => setOllamaModelDraft(event.target.value)}
                  onFocus={() => setUpdateTarget("local")}
                  placeholder="e.g. llama3"
                  autoComplete="off"
                />
              </label>

              {isOllamaActive ? (
                <button
                  type="button"
                  className="providerModal_secondaryBtn providerModal_secondaryBtnFull"
                  disabled={saving || ollamaPingBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOllamaPingBusy(true);
                    void (async () => {
                      try {
                        const h = await fetchOllamaHealth();
                        if (h.ok) {
                          appToast.success("Ollama API responded — connection OK.");
                        } else {
                          appToast.error(
                            "Ollama did not respond — check it is running and URL settings.",
                          );
                        }
                      } catch (err) {
                        appToast.error(err instanceof Error ? err.message : "Check failed");
                      } finally {
                        setOllamaPingBusy(false);
                      }
                    })();
                  }}
                >
                  {ollamaPingBusy ? "Checking…" : "Test connection (no save)"}
                </button>
              ) : null}

              {ollamaSaveError ? <p className="providerModal_error">{ollamaSaveError}</p> : null}
              {localCtaError ? (
                <p className="providerModal_error providerModal_errorTight">{localCtaError}</p>
              ) : null}

              {localHelpVisible ? (
                <div className="providerModal_localHelp">
                  <p className="providerModal_localHelpTitle">Install and run Ollama</p>
                  <ol className="providerModal_localHelpList">
                    <li>
                      Install from{" "}
                      <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
                        ollama.com/download
                      </a>
                    </li>
                    <li>
                      Then run:
                      <pre className="providerModal_code">ollama run llama3</pre>
                    </li>
                  </ol>
                  <p className="providerModal_hint providerModal_hintTight">
                    Docker: set <code className="providerModal_codeInline">OLLAMA_BASE_URL</code>{" "}
                    (e.g.{" "}
                    <code className="providerModal_codeInline">http://host.docker.internal:11434</code>
                    ).
                  </p>
                  <button
                    type="button"
                    className="providerModal_retryCheck"
                    disabled={footerBusy || ollamaPingBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        setLocalConnecting(true);
                        try {
                          const h = await fetchOllamaHealth();
                          if (h.ok) {
                            setLocalHelpVisible(false);
                            appToast.success("Ollama responded — try Update local again.");
                          } else {
                            appToast.error("Still can't reach Ollama.");
                          }
                        } catch (err) {
                          appToast.error(err instanceof Error ? err.message : "Check failed");
                        } finally {
                          setLocalConnecting(false);
                        }
                      })();
                    }}
                  >
                    {localConnecting ? "Checking…" : "Check connection again"}
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          </div>

          <div className="providerModal_footer">
            <p className="providerModal_footerTarget" aria-live="polite">
              <span className="providerModal_footerTargetLabel">Update will apply to:</span>{" "}
              <strong>{updateTarget === "cloud" ? "Cloud (left)" : "Local (right)"}</strong>
            </p>
            <p className="providerModal_footerHint">{footerHint}</p>
            <button
              type="button"
              className="providerModal_footerBtn"
              disabled={footerBusy || ollamaPingBusy}
              onClick={() => void runUnifiedUpdate()}
            >
              {footerButtonLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
