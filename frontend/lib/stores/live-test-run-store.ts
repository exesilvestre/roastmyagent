import { create } from "zustand";

/**
 * Live streamed test on /sessions/:id/run
 */
type LiveTestRunState = {
  streamingSessionId: string | null;
  lastSavedRunId: string | null;
  setStreaming: (sessionId: string) => void;
  setRunSaved: (runId: string) => void;
  /** Clears only the sidebar "Live" indicator; keeps lastSavedRunId for the timeline link. */
  clearStreaming: () => void;
  /** Full reset when leaving the session or switching sessions. */
  resetForSessionLeave: () => void;
};

export const useLiveTestRunStore = create<LiveTestRunState>((set) => ({
  streamingSessionId: null,
  lastSavedRunId: null,
  setStreaming: (sessionId) =>
    set({ streamingSessionId: sessionId, lastSavedRunId: null }),
  setRunSaved: (runId) => set({ lastSavedRunId: runId }),
  clearStreaming: () => set({ streamingSessionId: null }),
  resetForSessionLeave: () =>
    set({ streamingSessionId: null, lastSavedRunId: null }),
}));
