"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import { useSessionStore, type CreateSessionAgentConnection } from "@/lib/stores/session-store";
import { appToast } from "@/lib/app-toast";
import { DEFAULT_JSON_BODY } from "./constants";
import { AgentStep } from "./AgentStep";
import { ConnectionStep } from "./ConnectionStep";
import { ModalHeader } from "./ModalHeader";
import { TestStep } from "./TestStep";
import type { HttpAuth, NewSessionModalProps, VerifyResult } from "./types";
import {
  buildAgentConnection,
  formatTestRequestPreview,
  urlTargetsSameApiAsApp,
} from "./utils";
import "./styles.css";

export function NewSessionModal({ open, onClose }: NewSessionModalProps) {
  const createSession = useSessionStore((s) => s.createSession);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [agentDescription, setAgentDescription] = useState("");

  const [mode, setMode] = useState<AgentConnectionKind>("HTTP_LOCAL");

  const [httpUrl, setHttpUrl] = useState("");
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
      payload = buildAgentConnection(
        mode,
        httpUrl,
        bodyKind,
        httpBodyJson,
        httpBodyText,
        httpAuth,
        basicUser,
        httpSecret,
      );
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
        <ModalHeader step={step} />

        {step === 0 ? (
          <AgentStep
            title={title}
            onTitleChange={setTitle}
            agentDescription={agentDescription}
            onAgentDescriptionChange={setAgentDescription}
            localError={localError}
            onClose={onClose}
            onNext={goNextAgent}
          />
        ) : step === 1 ? (
          <ConnectionStep
            mode={mode}
            onModeChange={setMode}
            httpUrl={httpUrl}
            onHttpUrlChange={setHttpUrl}
            bodyKind={bodyKind}
            onBodyKindChange={setBodyKind}
            httpBodyJson={httpBodyJson}
            onHttpBodyJsonChange={setHttpBodyJson}
            httpBodyText={httpBodyText}
            onHttpBodyTextChange={setHttpBodyText}
            httpAuth={httpAuth}
            onHttpAuthChange={setHttpAuth}
            basicUser={basicUser}
            onBasicUserChange={setBasicUser}
            httpSecret={httpSecret}
            onHttpSecretChange={setHttpSecret}
            httpUrlSameAsApi={httpUrlSameAsApi}
            connectionPayload={connectionPayload}
            localError={localError}
            onBack={() => {
              setStep(0);
              setLocalError(null);
            }}
            onNext={goNextConnection}
          />
        ) : (
          <TestStep
            testRequestPreview={testRequestPreview}
            testLoading={testLoading}
            testHint={testHint}
            connectionPayload={connectionPayload}
            localError={localError}
            titleTrimmed={!!title.trim()}
            submitting={submitting}
            onBack={() => {
              setStep(1);
              setLocalError(null);
            }}
            onTest={handleTest}
            onCreate={handleCreate}
          />
        )}
      </section>
    </div>
  );
}
