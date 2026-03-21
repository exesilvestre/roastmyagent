"use client";

import { useEffect, useState } from "react";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import type { LlmProviderId } from "@/lib/types/llm-provider";
import type { ProviderConfigModalProps } from "./types";
import "./styles.css";

const providerOrder: LlmProviderId[] = ["openai", "anthropic", "gemini"];

export function ProviderConfigModal({ open, onClose }: ProviderConfigModalProps) {
  const providers = useLlmProviderStore((s) => s.providers);
  const loading = useLlmProviderStore((s) => s.loading);
  const fetchProviders = useLlmProviderStore((s) => s.fetchProviders);
  const patchProvider = useLlmProviderStore((s) => s.patchProvider);
  const activateProvider = useLlmProviderStore((s) => s.activateProvider);

  const [selectedId, setSelectedId] = useState<LlmProviderId>("openai");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetchProviders();
  }, [open, fetchProviders]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const active = providers.find((p) => p.isActive);
    if (active) {
      setSelectedId(active.id as LlmProviderId);
    }
  }, [open, providers]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const p = providers.find((x) => x.id === selectedId);
    setModelDraft(p?.model ?? "");
    setApiKeyDraft("");
    setSaveError(null);
  }, [open, selectedId, providers]);

  if (!open) {
    return null;
  }

  const provider = providers.find((x) => x.id === selectedId);
  const isCurrent = provider?.isActive ?? false;

  return (
    <div className="providerModal_overlay" role="presentation" onClick={onClose}>
      <section
        className="providerModal"
        role="dialog"
        aria-modal="true"
        aria-label="LLM settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="providerModal_header">
          <h2 className="providerModal_title">LLM settings</h2>
        </div>
        <p className="providerModal_hint">
          Keys are sent to this app&apos;s backend and encrypted at rest (Fernet). One provider
          can be active at a time.
        </p>
        <label className="providerModal_label providerModal_labelSelect">
          Provider
          <select
            className="providerModal_select"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value as LlmProviderId);
              setSaveError(null);
            }}
            disabled={loading && providers.length === 0}
          >
            {providerOrder.map((id) => (
              <option key={id} value={id}>
                {providers.find((p) => p.id === id)?.label ?? id}
              </option>
            ))}
          </select>
        </label>
        {loading && providers.length === 0 ? (
          <p className="providerModal_hint">Loading…</p>
        ) : (
          <div className="providerModal_form">
            <div className="providerModal_formHeader">
              <span className="providerModal_formTitle">
                {provider?.label ?? selectedId}
              </span>
              {isCurrent ? (
                <span className="providerModal_badge">In use</span>
              ) : null}
            </div>
            <label className="providerModal_label">
              API key
              <input
                className="providerModal_input"
                type="password"
                value={apiKeyDraft}
                onChange={(event) => setApiKeyDraft(event.target.value)}
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
                placeholder="Model id"
              />
            </label>
            {saveError ? (
              <p className="providerModal_error">{saveError}</p>
            ) : null}
            <button
              type="button"
              className="providerModal_activate"
              disabled={saving}
              onClick={async () => {
                setSaveError(null);
                setSaving(true);
                try {
                  const patch: { apiKey?: string; model?: string } = {
                    model: modelDraft,
                  };
                  if (apiKeyDraft.trim() !== "") {
                    patch.apiKey = apiKeyDraft;
                  }
                  await patchProvider(selectedId, patch);
                  const ok = await activateProvider(selectedId);
                  if (!ok) {
                    setSaveError(
                      "Could not activate. Set model and API key (backend must have FERNET_KEY).",
                    );
                    setSaving(false);
                    return;
                  }
                  onClose();
                } catch (e) {
                  setSaveError(e instanceof Error ? e.message : "Save failed");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save and use this provider"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
