import { ProviderSelect } from "@/components/common/provider-select/ProviderSelect";
import type { CloudLlmProviderId } from "@/lib/types/llm-provider";
import type { ProviderConfigModalCloudProps } from "./types";

export function Cloud({
  focused,
  onColumnClick,
  isOllamaActive,
  isCurrentCloud,
  loading,
  providersEmpty,
  selectedId,
  onSelectedIdChange,
  providerSelectOptions,
  apiKeyDraft,
  modelDraft,
  onApiKeyDraftChange,
  onModelDraftChange,
  onCloudFieldFocus,
  cloudError,
  providerHasApiKey,
}: ProviderConfigModalCloudProps) {
  return (
    <div
      className={`providerModal_col providerModal_colCloud ${focused ? "providerModal_colFocused" : ""}`}
      onClick={onColumnClick}
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
      <label className="providerModal_label providerModal_labelSelect" onFocus={onCloudFieldFocus}>
        Provider
        <ProviderSelect
          value={selectedId}
          onChange={(id) => onSelectedIdChange(id as CloudLlmProviderId)}
          options={providerSelectOptions}
          disabled={loading && providersEmpty}
          ariaLabel="Cloud LLM provider"
        />
      </label>
      {loading && providersEmpty ? (
        <p className="providerModal_hint">Loading…</p>
      ) : (
        <>
          <label className="providerModal_label">
            API key
            <input
              className="providerModal_input"
              type="password"
              value={apiKeyDraft}
              onChange={(event) => onApiKeyDraftChange(event.target.value)}
              onFocus={onCloudFieldFocus}
              placeholder={providerHasApiKey ? "Leave blank to keep stored key" : "API key"}
              autoComplete="off"
            />
          </label>
          <label className="providerModal_label">
            Model
            <input
              className="providerModal_input"
              type="text"
              value={modelDraft}
              onChange={(event) => onModelDraftChange(event.target.value)}
              onFocus={onCloudFieldFocus}
              placeholder="Model id"
            />
          </label>
          {cloudError ? <p className="providerModal_error">{cloudError}</p> : null}
        </>
      )}
    </div>
  );
}


// review