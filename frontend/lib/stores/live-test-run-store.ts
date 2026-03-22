import { create } from "zustand";

/**
 * Live streamed test on /sessions/:id/run — drives a placeholder row in the test history sidebar
 * until the saved run appears from the API.
 */
type LiveTestRunState = {
  streamingSessionId: string | null;
  lastSavedRunId: string | null;
  setStreaming: (sessionId: string) => void;
  setRunSaved: (runId: string) => void;
  clearStreaming: () => void;
};

export const useLiveTestRunStore = create<LiveTestRunState>((set) => ({
  streamingSessionId: null,
  lastSavedRunId: null,
  setStreaming: (sessionId) =>
    set({ streamingSessionId: sessionId, lastSavedRunId: null }),
  setRunSaved: (runId) => set({ lastSavedRunId: runId }),
  clearStreaming: () => set({ streamingSessionId: null, lastSavedRunId: null }),
}));
