import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import type { SessionStatus } from "@/lib/types/session";

export type SessionApi = {
  id: string;
  title: string;
  agentDescription: string | null;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  agentConnection: {
    connectionKind: AgentConnectionKind;
    settings: Record<string, unknown>;
    hasSecret: boolean;
  } | null;
};

export type LlmProviderApi = {
  id: string;
  label: string;
  model: string | null;
  hasApiKey: boolean;
  isActive: boolean;
};

export type AttackPromptItemApi = {
  id: string;
  category: string;
  intent: string;
  promptText: string;
};

export type AttackPromptsListApi = {
  prompts: AttackPromptItemApi[];
};

export type AttackTestStepApi = {
  promptId: string;
  ok: boolean;
  statusCode: number | null;
  detail: string | null;
  responsePreview?: string | null;
  judgeScore?: number | null;
  judgeVerdict?: string | null;
  judgeReasoning?: string | null;
  judgeFailed?: boolean | null;
  judgeError?: string | null;
  /** Full structured fields from the judge (not truncated). */
  judgeConstraintSummary?: Record<string, string> | null;
};

export type AttackTestRunApi = {
  steps: AttackTestStepApi[];
};

export type AttackTestSuggestionsResponseApi = {
  suggestions: string;
};

/** SSE payloads: test pipeline progress only (not LLM token streaming). */
export type AttackTestStreamEvent =
  | { event: "run_started"; totalSteps: number }
  | {
      event: "step_started";
      index: number;
      promptId: string;
      category: string;
      intent: string;
    }
  | {
      event: "agent_finished";
      index: number;
      ok: boolean;
      statusCode: number | null;
      detail: string | null;
      responsePreview: string | null;
    }
  | { event: "judge_started"; index: number }
  | {
      event: "judge_finished";
      index: number;
      score: number | null;
      verdict: string | null;
      reasoning: string | null;
      failed: boolean;
      error: string | null;
      /** Full structured constraint summary (camelCase from API). */
      judgeConstraintSummary?: Record<string, string> | null;
      /** @deprecated Old runs; preformatted string. Prefer judgeConstraintSummary. */
      constraintSummary?: string | null;
    }
  | { event: "run_finished"; okCount: number; failCount: number }
  | { event: "run_saved"; runId: string }
  | { event: "error"; message: string };

export type AttackTestRunListItemApi = {
  id: string;
  createdAt: string;
  delaySeconds: number;
  totalSteps: number;
  okCount: number;
  failCount: number;
};

export type AttackTestRunDetailApi = AttackTestRunListItemApi & {
  events: AttackTestStreamEvent[];
};
