export const DELAY_OPTIONS = [5, 10, 20] as const;

export const TIMEOUT_MIN_SECONDS = 1;
export const TIMEOUT_MAX_SECONDS = 600;

export const COPY = {
  headerHint:
    "Save before running a test. Start testing opens a live view: each prompt is sent to " +
    "your HTTP agent (POST body), then an LLM judge scores the reply. Delay applies between " +
    "requests.",
  emptyNoPrompts:
    "No prompts yet. Generate with your active LLM provider (then Save), or use Add row.",
  toastSaveBeforeRun: "Save your prompts before running the test.",
  toastSelectPrompt: "Select at least one prompt.",
  toastAgentTimeoutRange: `Agent timeout must be a number between ${TIMEOUT_MIN_SECONDS} and ${TIMEOUT_MAX_SECONDS} seconds.`,
  timeoutInlineError: `Use a value between ${TIMEOUT_MIN_SECONDS} and ${TIMEOUT_MAX_SECONDS}.`,
  startTestTitleDirty: "Save prompts before running the test",
  startTestTitleNoSelection: "Select at least one prompt",
} as const;
