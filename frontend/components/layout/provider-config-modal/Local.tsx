import { OLLAMA_BASE_URL_DEFAULT, OLLAMA_DOWNLOAD_URL } from "./constants";
import type { ProviderConfigModalLocalProps } from "./types";

export function Local({
  focused,
  onColumnClick,
  isOllamaActive,
  ollamaModelDraft,
  onOllamaModelDraftChange,
  onLocalFieldFocus,
  localSaveError,
  localConnectError,
  localHelpVisible,
  testDisabled,
  testBusy,
  onTestConnection,
  retryDisabled,
  retryBusy,
  onRetryHelpCheck,
}: ProviderConfigModalLocalProps) {
  return (
    <div
      className={`providerModal_col providerModal_colLocal ${focused ? "providerModal_colFocused" : ""}`}
      onClick={onColumnClick}
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
          onChange={(event) => onOllamaModelDraftChange(event.target.value)}
          onFocus={onLocalFieldFocus}
          placeholder="e.g. llama3"
          autoComplete="off"
        />
      </label>

      {isOllamaActive ? (
        <button
          type="button"
          className="providerModal_secondaryBtn providerModal_secondaryBtnFull"
          disabled={testDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onTestConnection();
          }}
        >
          {testBusy ? "Checking…" : "Test connection (no save)"}
        </button>
      ) : null}

      {localSaveError ? <p className="providerModal_error">{localSaveError}</p> : null}
      {localConnectError ? (
        <p className="providerModal_error providerModal_errorTight">{localConnectError}</p>
      ) : null}

      {localHelpVisible ? (
        <div className="providerModal_localHelp">
          <p className="providerModal_localHelpTitle">Install and run Ollama</p>
          <ol className="providerModal_localHelpList">
            <li>
              Install from{" "}
              <a href={OLLAMA_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                ollama.com/download
              </a>
            </li>
            <li>
              Then run:
              <pre className="providerModal_code">ollama run llama3</pre>
            </li>
          </ol>
          <p className="providerModal_hint providerModal_hintTight">
            Docker: set <code className="providerModal_codeInline">OLLAMA_BASE_URL</code> (e.g.{" "}
            <code className="providerModal_codeInline">{OLLAMA_BASE_URL_DEFAULT}</code>).
          </p>
          <button
            type="button"
            className="providerModal_retryCheck"
            disabled={retryDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onRetryHelpCheck();
            }}
          >
            {retryBusy ? "Checking…" : "Check connection again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}


// review