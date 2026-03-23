import { getApiBaseUrl } from "@/lib/api/client";
import type {
  AttackTestSuggestionsResponseApi,
  AttackTestStreamEvent,
} from "@/lib/api/types";

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return res.statusText || String(res.status);
  }
  try {
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map(String).join(", ");
    }
  } catch {
    return text;
  }
  return text;
}

async function readSseJsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (ev: AttackTestStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processBuffer = () => {
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const json = trimmed.slice(5).trim();
        if (!json) {
          continue;
        }
        try {
          const ev = JSON.parse(json) as AttackTestStreamEvent;
          onEvent(ev);
        } catch {
          // skip malformed chunk
        }
      }
    }
  };

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        processBuffer();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
  } finally {
    reader.releaseLock();
  }
}

export async function postAttackTestStream(
  sessionId: string,
  body: { promptIds: string[]; delaySeconds: number },
  onEvent: (ev: AttackTestStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/v1/sessions/${sessionId}/attack-prompts/run/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptIds: body.promptIds,
      delaySeconds: body.delaySeconds,
    }),
    signal,
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  if (!res.body) {
    throw new Error("Empty response body");
  }
  await readSseJsonStream(res.body, onEvent, signal);
}

export async function postAttackSuggestions(
  sessionId: string,
  runId: string,
  stepIndex: number,
  signal?: AbortSignal,
): Promise<AttackTestSuggestionsResponseApi> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/v1/sessions/${sessionId}/attack-test-runs/${runId}/steps/${stepIndex}/suggestions`;
  const res = await fetch(url, {
    method: "POST",
    signal,
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<AttackTestSuggestionsResponseApi>;
}
