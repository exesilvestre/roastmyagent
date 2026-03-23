import type { AttackTestStreamEvent } from "@/lib/api/types";
import type { RunStepRow } from "@/lib/test-run/types";

export type FoldedTestRunState = {
  totalSteps: number;
  summary: { ok: number; fail: number } | null;
  byIndex: Record<number, RunStepRow>;
  fatalError: string | null;
};

export function foldAttackTestEvents(events: AttackTestStreamEvent[]): FoldedTestRunState {
  let totalSteps = 0;
  let summary: { ok: number; fail: number } | null = null;
  const byIndex: Record<number, RunStepRow> = {};
  let fatalError: string | null = null;

  for (const ev of events) {
    switch (ev.event) {
      case "run_saved":
        break;
      case "run_started":
        totalSteps = ev.totalSteps;
        break;
      case "step_started":
        byIndex[ev.index] = {
          ...byIndex[ev.index],
          index: ev.index,
          promptId: ev.promptId,
          category: ev.category,
          intent: ev.intent,
        };
        break;
      case "agent_finished":
        byIndex[ev.index] = {
          ...byIndex[ev.index],
          index: ev.index,
          agent: {
            ok: ev.ok,
            statusCode: ev.statusCode,
            detail: ev.detail,
            responsePreview: ev.responsePreview,
          },
        };
        break;
      case "judge_started":
        byIndex[ev.index] = {
          ...byIndex[ev.index],
          index: ev.index,
          judgePending: true,
        };
        break;
      case "judge_finished":
        byIndex[ev.index] = {
          ...byIndex[ev.index],
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
        };
        break;
      case "run_finished":
        summary = { ok: ev.okCount, fail: ev.failCount };
        break;
      case "error":
        fatalError = ev.message;
        break;
      default:
        break;
    }
  }

  return { totalSteps, summary, byIndex, fatalError };
}

export function orderedStepsFromFold(byIndex: Record<number, RunStepRow>): RunStepRow[] {
  return Object.values(byIndex).sort((a, b) => a.index - b.index);
}
