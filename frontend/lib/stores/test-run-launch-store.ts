import { create } from "zustand";

/** Metadata for each prompt in run order (matches `promptIds`). */
export type PlannedPromptMeta = {
  id: string;
  category: string;
  intent: string;
  /** Exact prompt text used for the HTTP test. */
  promptText?: string;
};

export type TestRunLaunchPayload = {
  sessionId: string;
  promptIds: string[];
  delaySeconds: number;
  agentTimeoutSeconds: number | null;
  /** Same length and order as `promptIds` when set from Prompts UI. */
  plannedPrompts?: PlannedPromptMeta[];
};

const STORAGE_PREFIX = "rma-test-run:";

export function persistTestRunLaunchToSessionStorage(payload: TestRunLaunchPayload): void {
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${payload.sessionId}`,
      JSON.stringify({
        promptIds: payload.promptIds,
        delaySeconds: payload.delaySeconds,
        agentTimeoutSeconds: payload.agentTimeoutSeconds,
        plannedPrompts: payload.plannedPrompts,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** Used by the run page when Zustand was already consumed (e.g. React Strict Mode remount). */
export function clearTestRunLaunchSessionStorage(sessionId: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
  } catch {
    /* ignore */
  }
}

export function consumeTestRunLaunchFromSessionStorage(
  sessionId: string,
): TestRunLaunchPayload | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    const parsed = JSON.parse(raw) as {
      promptIds: string[];
      delaySeconds: number;
      agentTimeoutSeconds?: number | null;
      plannedPrompts?: PlannedPromptMeta[];
    };
    return {
      sessionId,
      promptIds: parsed.promptIds,
      delaySeconds: parsed.delaySeconds,
      agentTimeoutSeconds:
        parsed.agentTimeoutSeconds === null || typeof parsed.agentTimeoutSeconds === "number"
          ? parsed.agentTimeoutSeconds
          : 20,
      plannedPrompts: parsed.plannedPrompts,
    };
  } catch {
    return null;
  }
}

type TestRunLaunchState = {
  pending: TestRunLaunchPayload | null;
  setPending: (payload: TestRunLaunchPayload) => void;
  consumeIfSession: (sessionId: string) => TestRunLaunchPayload | null;
};

export const useTestRunLaunchStore = create<TestRunLaunchState>((set, get) => ({
  pending: null,
  setPending: (payload) => set({ pending: payload }),
  consumeIfSession: (sessionId) => {
    const p = get().pending;
    if (!p || p.sessionId !== sessionId) {
      return null;
    }
    set({ pending: null });
    return p;
  },
}));
