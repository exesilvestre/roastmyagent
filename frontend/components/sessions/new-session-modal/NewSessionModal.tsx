"use client";

import { useEffect, useMemo, useState } from "react";
import { ProviderSelect } from "@/components/ui/provider-select/ProviderSelect";
import { apiFetch, getApiBaseUrl } from "@/lib/api/client";
import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import { useSessionStore, type CreateSessionAgentConnection } from "@/lib/stores/session-store";
import { appToast } from "@/lib/app-toast";
import type { NewSessionModalProps } from "./types";
import "./styles.css";

const CONNECTION_OPTIONS = [
  { id: "HTTP_LOCAL", label: "HTTP local" },
  { id: "HTTP_REMOTE_BASIC", label: "HTTP remote" },
];

const HTTP_METHOD_OPTIONS = [
  { id: "GET", label: "GET" },
  { id: "POST", label: "POST" },
];

const BODY_KIND_OPTIONS = [
  { id: "json", label: "JSON" },
  { id: "text", label: "Plain text" },
];

const HTTP_AUTH_OPTIONS = [
  { id: "none", label: "No authentication" },
  { id: "bearer", label: "Bearer token" },
  { id: "basic", label: "Username & password (Basic)" },
];

type HttpAuth = "none" | "bearer" | "basic";

const DEFAULT_JSON_BODY = '{\n  "message": "hello"\n}';

type VerifyResult = { ok: boolean; detail?: string | null; preview?: string | null };

function loopbackHost(hostname: string): string {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
    ? "loopback"
    : hostname;
}

/** True if the URL targets the same host:port as this app's API (common mistake → 404 on /chat). */
function urlTargetsSameApiAsApp(urlStr: string): boolean {
  const t = urlStr.trim();
  if (!t) {
    return false;
  }
  try {
    const u = new URL(t);
    const api = new URL(getApiBaseUrl());
    const pu = u.port || (u.protocol === "https:" ? "443" : "80");
    const pa = api.port || (api.protocol === "https:" ? "443" : "80");
    return loopbackHost(u.hostname) === loopbackHost(api.hostname) && pu === pa;
  } catch {
    return false;
  }
}

function buildAgentConnection(
  mode: AgentConnectionKind,
  httpUrl: string,
  httpMethod: string,
  bodyKind: string,
  httpBodyJson: string,
  httpBodyText: string,
  httpAuth: HttpAuth,
  basicUser: string,
  httpSecret: string,
): CreateSessionAgentConnection {
  const bodyContent = bodyKind === "json" ? httpBodyJson : httpBodyText;

  if (mode === "HTTP_LOCAL") {
    const settings: Record<string, unknown> = {
      url: httpUrl.trim(),
      httpMethod,
      bodyKind,
      bodyContent,
      authType: httpAuth,
    };
    if (httpAuth === "basic") {
      settings.username = basicUser.trim();
    }
    const sec =
      httpAuth === "bearer" || httpAuth === "basic" ? httpSecret.trim() : "";
    return {
      connectionKind: "HTTP_LOCAL",
      settings,
      ...(sec ? { secret: sec } : {}),
    };
  }

  const settings: Record<string, unknown> = {
    url: httpUrl.trim(),
    httpMethod,
    bodyKind,
    bodyContent,
    authType: httpAuth,
  };
  if (httpAuth === "basic") {
    settings.username = basicUser.trim();
  }

  const secretRemote =
    httpAuth === "bearer" || httpAuth === "basic" ? httpSecret.trim() : "";

  return {
    connectionKind: "HTTP_REMOTE_BASIC",
    settings,
    ...(secretRemote ? { secret: secretRemote } : {}),
  };
}

function formatTestRequestPreview(
  payload: CreateSessionAgentConnection | undefined,
): string {
  if (!payload) {
    return "";
  }
  const s = payload.settings as Record<string, unknown>;
  const url = String(s.url || "").trim() || "(no URL)";
  const method = String(s.httpMethod || "POST").toUpperCase();
  const isHttp =
    payload.connectionKind === "HTTP_REMOTE_BASIC" ||
    payload.connectionKind === "HTTP_LOCAL";
  const authType = String(s.authType || "none").toLowerCase();
  const authLines: string[] = [];
  if (isHttp) {
    if (authType === "none" || authType === "") {
      authLines.push("Authentication: none");
    } else if (authType === "bearer") {
      authLines.push("Authentication: Bearer (token applied on request)");
    } else if (authType === "basic") {
      const u = String(s.username || "").trim();
      authLines.push(`Authentication: Basic (user: ${u || "—"})`);
    }
  }
  if (method === "GET") {
    return ["GET " + url, ...authLines].join("\n");
  }
  const bk = String(s.bodyKind || "json");
  const raw = s.bodyContent != null ? String(s.bodyContent) : "";
  if (bk === "text") {
    const body = raw.trim() || "hello";
    return [
      "POST " + url,
      ...authLines,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\n");
  }
  let jsonBlock = raw.trim() || '{"message":"hello"}';
  try {
    jsonBlock = JSON.stringify(JSON.parse(jsonBlock), null, 2);
  } catch {
    // keep as typed
  }
  return [
    "POST " + url,
    ...authLines,
    "Content-Type: application/json; charset=utf-8",
    "",
    jsonBlock,
  ].join("\n");
}

export function NewSessionModal({ open, onClose }: NewSessionModalProps) {
  const createSession = useSessionStore((s) => s.createSession);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [agentDescription, setAgentDescription] = useState("");

  const [mode, setMode] = useState<AgentConnectionKind>("HTTP_LOCAL");

  const [httpUrl, setHttpUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState("POST");
  const [bodyKind, setBodyKind] = useState("json");
  const [httpBodyJson, setHttpBodyJson] = useState(DEFAULT_JSON_BODY);
  const [httpBodyText, setHttpBodyText] = useState("hello");
  const [httpAuth, setHttpAuth] = useState<HttpAuth>("none");
  const [basicUser, setBasicUser] = useState("");
  const [httpSecret, setHttpSecret] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [testHint, setTestHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(0);
    setTitle("");
    setAgentDescription("");
    setMode("HTTP_LOCAL");
    setHttpUrl("");
    setHttpMethod("POST");
    setBodyKind("json");
    setHttpBodyJson(DEFAULT_JSON_BODY);
    setHttpBodyText("hello");
    setHttpAuth("none");
    setBasicUser("");
    setHttpSecret("");
    setLocalError(null);
    setTestHint(null);
    setSubmitting(false);
    setTestLoading(false);
  }, [open]);

  const connectionPayload = useMemo(() => {
    try {
      return buildAgentConnection(
        mode,
        httpUrl,
        httpMethod,
        bodyKind,
        httpBodyJson,
        httpBodyText,
        httpAuth,
        basicUser,
        httpSecret,
      );
    } catch {
      return undefined;
    }
  }, [
    mode,
    httpUrl,
    httpMethod,
    bodyKind,
    httpBodyJson,
    httpBodyText,
    httpAuth,
    basicUser,
    httpSecret,
  ]);

  const testRequestPreview = useMemo(
    () => formatTestRequestPreview(connectionPayload),
    [connectionPayload],
  );

  const httpUrlSameAsApi = useMemo(
    () =>
      (mode === "HTTP_LOCAL" || mode === "HTTP_REMOTE_BASIC") &&
      urlTargetsSameApiAsApp(httpUrl),
    [mode, httpUrl],
  );

  if (!open) {
    return null;
  }

  const goNextAgent = () => {
    setLocalError(null);
    if (!title.trim()) {
      setLocalError("Agent name is required.");
      return;
    }
    setStep(1);
  };

  const goNextConnection = () => {
    setLocalError(null);
    if (!connectionPayload) {
      setLocalError("Fix connection fields (e.g. HTTP URL).");
      return;
    }
    setStep(2);
  };

  const handleTest = async () => {
    setTestHint(null);
    setLocalError(null);
    let payload: CreateSessionAgentConnection;
    try {
      const built = buildAgentConnection(
        mode,
        httpUrl,
        httpMethod,
        bodyKind,
        httpBodyJson,
        httpBodyText,
        httpAuth,
        basicUser,
        httpSecret,
      );
      payload = built;
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Invalid connection settings");
      return;
    }
    setTestLoading(true);
    try {
      const res = await apiFetch<VerifyResult>("/api/v1/agent-connection/verify", {
        method: "POST",
        body: JSON.stringify({
          connectionKind: payload.connectionKind,
          settings: payload.settings,
          ...(payload.secret ? { secret: payload.secret } : {}),
        }),
      });
      if (res.ok) {
        setTestHint(res.preview ? `OK — ${res.preview}` : "OK");
        appToast.success("Connection OK");
      } else {
        setTestHint(res.detail || "Failed");
        appToast.error(res.detail || "Connection failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verify failed";
      setTestHint(msg);
      appToast.error(msg);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError("Agent name is required.");
      return;
    }
    setLocalError(null);
    let ac: CreateSessionAgentConnection;
    try {
      ac = buildAgentConnection(
        mode,
        httpUrl,
        httpMethod,
        bodyKind,
        httpBodyJson,
        httpBodyText,
        httpAuth,
        basicUser,
        httpSecret,
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid connection settings");
      return;
    }
    setSubmitting(true);
    try {
      await createSession({
        title: trimmed,
        agentDescription: agentDescription.trim() || undefined,
        agentConnection: ac,
      });
      appToast.success("Session created");
      onClose();
    } catch (e) {
      setSubmitting(false);
      setLocalError(e instanceof Error ? e.message : "Failed to create session");
    }
  };

  return (
    <div className="newSessionModal_overlay" role="presentation" onClick={onClose}>
      <section
        className="newSessionModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newSessionModal_heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="newSessionModal_header">
          <h2 id="newSessionModal_heading" className="newSessionModal_title">
            New test session
          </h2>
          <nav className="newSessionModal_stepper" aria-label="Session steps">
            <ol className="newSessionModal_stepperList">
              <li
                className={`newSessionModal_step ${step === 0 ? "newSessionModal_stepCurrent" : ""} ${step > 0 ? "newSessionModal_stepDone" : ""}`}
                aria-current={step === 0 ? "step" : undefined}
              >
                <span className="newSessionModal_stepBadge" aria-hidden="true">
                  {step > 0 ? "✓" : "1"}
                </span>
                <span className="newSessionModal_stepText">Agent</span>
              </li>
              <li className="newSessionModal_stepLine" aria-hidden="true" />
              <li
                className={`newSessionModal_step ${step === 1 ? "newSessionModal_stepCurrent" : ""} ${step > 1 ? "newSessionModal_stepDone" : ""}`}
                aria-current={step === 1 ? "step" : undefined}
              >
                <span className="newSessionModal_stepBadge" aria-hidden="true">
                  {step > 1 ? "✓" : "2"}
                </span>
                <span className="newSessionModal_stepText">Connection</span>
              </li>
              <li className="newSessionModal_stepLine" aria-hidden="true" />
              <li
                className={`newSessionModal_step ${step === 2 ? "newSessionModal_stepCurrent" : ""}`}
                aria-current={step === 2 ? "step" : undefined}
              >
                <span className="newSessionModal_stepBadge" aria-hidden="true">
                  3
                </span>
                <span className="newSessionModal_stepText">Test</span>
              </li>
            </ol>
            <p className="newSessionModal_stepCaption">
              {step === 0
                ? "Step 1 of 3 — name and describe the agent."
                : step === 1
                  ? "Step 2 of 3 — how the API reaches the agent."
                  : "Step 3 of 3 — verify the connection, then create the session."}
            </p>
          </nav>
        </div>

        {step === 0 ? (
          <div className="newSessionModal_form">
            <p className="newSessionModal_hint">
              Name the agent and describe what it does. That context is used like a system prompt for
              tailored adversarial tests.
            </p>
            <label className="newSessionModal_label">
              Agent name
              <input
                className="newSessionModal_input"
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                autoComplete="off"
                placeholder="e.g. Support triage bot"
              />
            </label>
            <label className="newSessionModal_label">
              What it does (optional)
              <textarea
                className="newSessionModal_textarea newSessionModal_textarea_step1"
                value={agentDescription}
                onChange={(ev) => setAgentDescription(ev.target.value)}
                placeholder="System Prompt, Role, allowed tools, data it sees, boundaries…"
              />
            </label>
            {localError ? (
              <p className="newSessionModal_error" role="alert">
                {localError}
              </p>
            ) : null}
            <div className="newSessionModal_actions">
              <button type="button" className="newSessionModal_cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="newSessionModal_submit" onClick={goNextAgent}>
                Next
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="newSessionModal_form">
            <p className="newSessionModal_hint">
              Set URL, HTTP method, and (for remote) whether the endpoint uses auth. Define the JSON
              or text body for the test call — step 3 shows exactly what will be sent.
            </p>
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
                  onChange={(id) => setMode(id as AgentConnectionKind)}
                  options={CONNECTION_OPTIONS}
                />
              </label>

              {mode === "HTTP_LOCAL" ? (
                <p className="newSessionModal_dockerHint">
                  API in Docker → agent on your machine: use{" "}
                  <code className="newSessionModal_code">host.docker.internal</code>, not localhost.
                </p>
              ) : null}
              <label className="newSessionModal_label">
                URL
                <input
                  className="newSessionModal_input"
                  value={httpUrl}
                  onChange={(ev) => setHttpUrl(ev.target.value)}
                  placeholder="https://example.com/v1/chat"
                  autoComplete="off"
                />
              </label>
              {httpUrlSameAsApi ? (
                <p className="newSessionModal_urlConflict" role="alert">
                  This URL uses the same host and port as this app&apos;s API. The test request hits
                  the RoastMyAgent server (you&apos;ll see{" "}
                  <code className="newSessionModal_code">POST /chat</code> → 404), not your agent.
                  Use your agent&apos;s URL on a different port (for example{" "}
                  <code className="newSessionModal_code">http://localhost:8080/chat</code>).
                </p>
              ) : null}
              <label className="newSessionModal_label">
                Method
                <ProviderSelect
                  ariaLabel="HTTP method"
                  value={httpMethod}
                  onChange={setHttpMethod}
                  options={HTTP_METHOD_OPTIONS}
                />
              </label>
              <label className="newSessionModal_label">
                Authentication
                <ProviderSelect
                  ariaLabel="HTTP authentication"
                  value={httpAuth}
                  onChange={(id) => setHttpAuth(id as HttpAuth)}
                  options={HTTP_AUTH_OPTIONS}
                />
              </label>
              {httpAuth === "bearer" ? (
                <label className="newSessionModal_label">
                  Bearer token
                  <input
                    className="newSessionModal_input"
                    value={httpSecret}
                    onChange={(ev) => setHttpSecret(ev.target.value)}
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
                      onChange={(ev) => setBasicUser(ev.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="newSessionModal_label">
                    Password
                    <input
                      className="newSessionModal_input"
                      value={httpSecret}
                      onChange={(ev) => setHttpSecret(ev.target.value)}
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
                  onChange={setBodyKind}
                  options={BODY_KIND_OPTIONS}
                  disabled={httpMethod === "GET"}
                />
              </label>
              {httpMethod === "POST" && bodyKind === "json" ? (
                <label className="newSessionModal_label">
                  JSON body (sent on test)
                  <textarea
                    className="newSessionModal_textarea newSessionModal_textarea_short newSessionModal_textarea_code"
                    value={httpBodyJson}
                    onChange={(ev) => setHttpBodyJson(ev.target.value)}
                    placeholder={DEFAULT_JSON_BODY}
                    spellCheck={false}
                  />
                </label>
              ) : null}
              {httpMethod === "POST" && bodyKind === "text" ? (
                <label className="newSessionModal_label">
                  Text body (sent on test)
                  <input
                    className="newSessionModal_input"
                    value={httpBodyText}
                    onChange={(ev) => setHttpBodyText(ev.target.value)}
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
              <button
                type="button"
                className="newSessionModal_cancel"
                onClick={() => {
                  setStep(0);
                  setLocalError(null);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="newSessionModal_submit"
                disabled={!connectionPayload}
                onClick={goNextConnection}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="newSessionModal_form">
            <p className="newSessionModal_hint">
              This is what will be sent for the test. Run the check below; edit connection on step 2
              if something looks wrong.
            </p>
            <div className="newSessionModal_previewBlock">
              <div className="newSessionModal_previewLabel">Request preview</div>
              <pre className="newSessionModal_previewPre">{testRequestPreview || "—"}</pre>
            </div>
            <div className="newSessionModal_section newSessionModal_sectionNoBorder">
              <div className="newSessionModal_testRow">
                <button
                  type="button"
                  className="newSessionModal_test"
                  disabled={testLoading || !connectionPayload}
                  onClick={() => void handleTest().catch(() => {})}
                >
                  {testLoading ? "Testing…" : "Test connection"}
                </button>
                {testHint ? <p className="newSessionModal_testHint">{testHint}</p> : null}
              </div>
            </div>
            {localError ? (
              <p className="newSessionModal_error" role="alert">
                {localError}
              </p>
            ) : null}
            <div className="newSessionModal_actions newSessionModal_actionsStep2">
              <button
                type="button"
                className="newSessionModal_cancel"
                onClick={() => {
                  setStep(1);
                  setLocalError(null);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="newSessionModal_submit"
                disabled={submitting || !title.trim()}
                onClick={() => void handleCreate().catch(() => {})}
              >
                {submitting ? "Creating…" : "Create session"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
