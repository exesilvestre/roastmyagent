import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AttackPromptsListApi, AttackTestStreamEvent } from "@/lib/api/types";
import { postAttackTestStream } from "@/lib/api/attackTestStream";
import { useLiveTestRunStore } from "@/lib/stores/live-test-run-store";
import type { TestRunLaunchPayload } from "@/lib/stores/test-run-launch-store";
import type { RunStepRow } from "@/lib/test-run/types";

export type AttackTestRunPhase = "idle" | "running" | "done" | "error";

export type AttackTestRunSnapshot = {
  launch: TestRunLaunchPayload | null;
  phase: AttackTestRunPhase;
  totalSteps: number;
  summary: { ok: number; fail: number } | null;
  byIndex: Record<number, RunStepRow>;
  fatalError: string | null;
  promptTextById: Record<string, string>;
};

const initialSnapshot: AttackTestRunSnapshot = {
  launch: null,
  phase: "idle",
  totalSteps: 0,
  summary: null,
  byIndex: {},
  fatalError: null,
  promptTextById: {},
};

let snapshot: AttackTestRunSnapshot = { ...initialSnapshot };
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) {
    l();
  }
}

function replace(next: AttackTestRunSnapshot): void {
  snapshot = next;
  emit();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): AttackTestRunSnapshot {
  return snapshot;
}

function getServerSnapshot(): AttackTestRunSnapshot {
  return initialSnapshot;
}

/** React hook: subscribe to module-level run state (no Zustand). */
export function useAttackTestRunStreamState(): AttackTestRunSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function resetForLaunch(launch: TestRunLaunchPayload): void {
  replace({
    ...initialSnapshot,
    launch,
    phase: "running",
  });
}

function applyEvent(ev: AttackTestStreamEvent): void {
  const s = snapshot;
  switch (ev.event) {
    case "run_started":
      replace({
        ...s,
        totalSteps: ev.totalSteps,
        byIndex: {},
        summary: null,
        fatalError: null,
      });
      break;
    case "step_started":
      replace({
        ...s,
        byIndex: {
          ...s.byIndex,
          [ev.index]: {
            ...s.byIndex[ev.index],
            index: ev.index,
            promptId: ev.promptId,
            category: ev.category,
            intent: ev.intent,
          },
        },
      });
      break;
    case "agent_finished":
      replace({
        ...s,
        byIndex: {
          ...s.byIndex,
          [ev.index]: {
            ...s.byIndex[ev.index],
            index: ev.index,
            agent: {
              ok: ev.ok,
              statusCode: ev.statusCode,
              detail: ev.detail,
              responsePreview: ev.responsePreview,
            },
          },
        },
      });
      break;
    case "judge_started":
      replace({
        ...s,
        byIndex: {
          ...s.byIndex,
          [ev.index]: {
            ...s.byIndex[ev.index],
            index: ev.index,
            judgePending: true,
          },
        },
      });
      break;
    case "judge_finished":
      replace({
        ...s,
        byIndex: {
          ...s.byIndex,
          [ev.index]: {
            ...s.byIndex[ev.index],
            index: ev.index,
            judgePending: false,
            judge: {
              score: ev.score,
              verdict: ev.verdict,
              reasoning: ev.reasoning,
              failed: ev.failed,
              error: ev.error,
              judgeConstraintSummary: ev.judgeConstraintSummary ?? null,
              constraintSummary: ev.constraintSummary ?? null,
            },
          },
        },
      });
      break;
    case "run_finished":
      replace({
        ...s,
        summary: { ok: ev.okCount, fail: ev.failCount },
        phase: "done",
      });
      break;
    case "run_saved":
      useLiveTestRunStore.getState().setRunSaved(ev.runId);
      break;
    case "error":
      replace({
        ...s,
        fatalError: ev.message,
        phase: "error",
      });
      break;
    default:
      break;
  }
}

let streamAbort: AbortController | null = null;
let streamSessionId: string | null = null;

export function abortAttackTestStreamForSession(sessionId: string): void {
  if (streamSessionId === sessionId && streamAbort) {
    streamAbort.abort();
    streamAbort = null;
    streamSessionId = null;
  }
}

export function resetAttackTestRunStreamState(): void {
  replace({ ...initialSnapshot });
}

export async function startAttackTestStream(
  sessionId: string,
  launch: TestRunLaunchPayload,
): Promise<void> {
  if (streamAbort) {
    streamAbort.abort();
    streamAbort = null;
    streamSessionId = null;
  }

  const ac = new AbortController();
  streamAbort = ac;
  streamSessionId = sessionId;

  useLiveTestRunStore.getState().setStreaming(sessionId);
  resetForLaunch(launch);

  try {
    const data = await apiFetch<AttackPromptsListApi>(
      `/api/v1/sessions/${sessionId}/attack-prompts`,
    );
    const m: Record<string, string> = {};
    for (const p of data.prompts) {
      m[p.id] = p.promptText;
    }
    replace({ ...snapshot, promptTextById: m });
  } catch {
    /* keep empty map */
  }

  try {
    await postAttackTestStream(
      sessionId,
      {
        promptIds: launch.promptIds,
        delaySeconds: launch.delaySeconds,
        agentTimeoutSeconds: launch.agentTimeoutSeconds,
      },
      applyEvent,
      ac.signal,
    );
    if (snapshot.phase === "running") {
      replace({ ...snapshot, phase: "done" });
    }
  } catch (e) {
    if (ac.signal.aborted) {
      return;
    }
    const msg = e instanceof Error ? e.message : "Stream failed";
    replace({ ...snapshot, fatalError: msg, phase: "error" });
  } finally {
    if (streamAbort === ac) {
      streamAbort = null;
      streamSessionId = null;
    }
  }
}
