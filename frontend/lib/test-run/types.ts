export type RunStepRow = {
  index: number;
  promptId?: string;
  /** Adversarial message sent to the agent (from launch plan or prompts API lookup). */
  promptText?: string;
  category?: string;
  intent?: string;
  agent?: {
    ok: boolean;
    statusCode: number | null;
    detail: string | null;
    responsePreview: string | null;
  };
  judgePending?: boolean;
  judge?: {
    score: number | null;
    verdict: string | null;
    reasoning: string | null;
    failed: boolean;
    error: string | null;
    constraintSummary?: string | null;
  };
};
