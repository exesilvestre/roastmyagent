import { getApiBaseUrl } from "@/lib/api/client";
import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import type { CreateSessionAgentConnection } from "@/lib/stores/session-store";
import { normalizeAgentHttpUrl } from "@/lib/normalizeAgentHttpUrl";
import type { HttpAuth } from "./types";

function loopbackHost(hostname: string): string {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
    ? "loopback"
    : hostname;
}

/** True if the URL targets the same host:port as this app's API (common mistake → 404 on /chat). */
export function urlTargetsSameApiAsApp(urlStr: string): boolean {
  const t = urlStr.trim();
  if (!t) {
    return false;
  }
  try {
    const u = new URL(normalizeAgentHttpUrl(t));
    const api = new URL(getApiBaseUrl());
    const pu = u.port || (u.protocol === "https:" ? "443" : "80");
    const pa = api.port || (api.protocol === "https:" ? "443" : "80");
    return loopbackHost(u.hostname) === loopbackHost(api.hostname) && pu === pa;
  } catch {
    return false;
  }
}

export function buildAgentConnection(
  mode: AgentConnectionKind,
  httpUrl: string,
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
      url: normalizeAgentHttpUrl(httpUrl),
      httpMethod: "POST",
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
    url: normalizeAgentHttpUrl(httpUrl),
    httpMethod: "POST",
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

export function formatTestRequestPreview(
  payload: CreateSessionAgentConnection | undefined,
): string {
  if (!payload) {
    return "";
  }
  const s = payload.settings as Record<string, unknown>;
  const url = String(s.url || "").trim() || "(no URL)";
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
