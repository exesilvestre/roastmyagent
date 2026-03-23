import { ProviderSelect } from "@/components/ui/provider-select/ProviderSelect";
import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import {
  BODY_KIND_OPTIONS,
  CONNECTION_OPTIONS,
  DEFAULT_JSON_BODY,
  HTTP_AUTH_OPTIONS,
} from "./constants";
import type { HttpAuth, NewSessionConnectionStepProps } from "./types";

export function ConnectionStep({
  mode,
  onModeChange,
  httpUrl,
  onHttpUrlChange,
  bodyKind,
  onBodyKindChange,
  httpBodyJson,
  onHttpBodyJsonChange,
  httpBodyText,
  onHttpBodyTextChange,
  httpAuth,
  onHttpAuthChange,
  basicUser,
  onBasicUserChange,
  httpSecret,
  onHttpSecretChange,
  httpUrlSameAsApi,
  connectionPayload,
  localError,
  onBack,
  onNext,
}: NewSessionConnectionStepProps) {
  return (
    <div className="newSessionModal_form">
      <p className="newSessionModal_hint">
        Only HTTP is supported for now; other transports (for example WebSocket) may be added
        later.
      </p>

      <div className="newSessionModal_section">
        <label className="newSessionModal_label">
          Connection
          <ProviderSelect
            ariaLabel="Connection type"
            value={mode}
            onChange={(id) => onModeChange(id as AgentConnectionKind)}
            options={CONNECTION_OPTIONS}
          />
        </label>

        {mode === "HTTP_LOCAL" ? (
          <p className="newSessionModal_dockerHint">
            HTTP local: when the API runs in Docker,{" "}
            <code className="newSessionModal_code">localhost</code> /{" "}
            <code className="newSessionModal_code">127.0.0.1</code> /{" "}
            <code className="newSessionModal_code">::1</code> are rewritten to{" "}
            <code className="newSessionModal_code">host.docker.internal</code> on each request so
            the container can reach your machine. Example:{" "}
            <code className="newSessionModal_code">http://localhost:8001/…</code>. If the API runs
            on your host (not in Docker), the URL is left as you typed.
          </p>
        ) : (
          <p className="newSessionModal_dockerHint">
            HTTP remote: the URL is used exactly as entered (no loopback rewrite).
          </p>
        )}
        <label className="newSessionModal_label">
          URL
          <input
            className="newSessionModal_input"
            value={httpUrl}
            onChange={(ev) => onHttpUrlChange(ev.target.value)}
            placeholder={
              mode === "HTTP_LOCAL"
                ? "http://localhost:8001/v1/chat"
                : "https://api.example.com/v1/chat"
            }
            autoComplete="off"
          />
        </label>
        {httpUrlSameAsApi ? (
          <p className="newSessionModal_urlConflict" role="alert">
            This URL uses the same host and port as this app&apos;s API. The test request hits the
            RoastMyAgent server (you&apos;ll see{" "}
            <code className="newSessionModal_code">POST /chat</code> → 404), not your agent. Use
            your agent&apos;s URL on a different port (for example{" "}
            <code className="newSessionModal_code">http://localhost:8080/chat</code>).
          </p>
        ) : null}
        <label className="newSessionModal_label">
          Authentication
          <ProviderSelect
            ariaLabel="HTTP authentication"
            value={httpAuth}
            onChange={(id) => onHttpAuthChange(id as HttpAuth)}
            options={HTTP_AUTH_OPTIONS}
          />
        </label>
        {httpAuth === "bearer" ? (
          <label className="newSessionModal_label">
            Bearer token
            <input
              className="newSessionModal_input"
              value={httpSecret}
              onChange={(ev) => onHttpSecretChange(ev.target.value)}
              type="password"
              autoComplete="off"
              placeholder="Token"
            />
          </label>
        ) : null}
        {httpAuth === "basic" ? (
          <>
            <label className="newSessionModal_label">
              Username
              <input
                className="newSessionModal_input"
                value={basicUser}
                onChange={(ev) => onBasicUserChange(ev.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="newSessionModal_label">
              Password
              <input
                className="newSessionModal_input"
                value={httpSecret}
                onChange={(ev) => onHttpSecretChange(ev.target.value)}
                type="password"
                autoComplete="off"
              />
            </label>
          </>
        ) : null}
        <label className="newSessionModal_label">
          POST body type
          <ProviderSelect
            ariaLabel="POST body type"
            value={bodyKind}
            onChange={onBodyKindChange}
            options={BODY_KIND_OPTIONS}
          />
        </label>
        {bodyKind === "json" ? (
          <label className="newSessionModal_label">
            JSON body (sent on test)
            <textarea
              className="newSessionModal_textarea newSessionModal_textarea_short newSessionModal_textarea_code"
              value={httpBodyJson}
              onChange={(ev) => onHttpBodyJsonChange(ev.target.value)}
              placeholder={DEFAULT_JSON_BODY}
              spellCheck={false}
            />
          </label>
        ) : null}
        {bodyKind === "text" ? (
          <label className="newSessionModal_label">
            Text body (sent on test)
            <input
              className="newSessionModal_input"
              value={httpBodyText}
              onChange={(ev) => onHttpBodyTextChange(ev.target.value)}
              placeholder="hello"
              autoComplete="off"
            />
          </label>
        ) : null}
      </div>

      {localError ? (
        <p className="newSessionModal_error" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="newSessionModal_actions newSessionModal_actionsStep2">
        <button type="button" className="newSessionModal_cancel" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="newSessionModal_submit"
          disabled={!connectionPayload}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
