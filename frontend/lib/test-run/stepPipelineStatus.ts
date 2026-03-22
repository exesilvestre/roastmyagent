import type { RunStepRow } from "@/lib/test-run/types";

/** Pipeline phase derived from live SSE state for one index (`undefined` = no event yet). */
export type StepPipelinePhase =
  | "queued"
  | "agent_running"
  | "agent_complete"
  | "judging"
  | "complete";

export function getStepPipelinePhase(live: RunStepRow | undefined): StepPipelinePhase {
  if (!live) {
    return "queued";
  }
  if (!live.agent) {
    return "agent_running";
  }
  if (live.judgePending) {
    return "judging";
  }
  if (live.judge) {
    return "complete";
  }
  return "agent_complete";
}

/** Index of the step that should be highlighted as “current” while the run is live. */
export function findLiveFocusIndex(
  byIndex: Record<number, RunStepRow | undefined>,
  rowCount: number,
): number {
  for (let i = 0; i < rowCount; i++) {
    const live = byIndex[i];
    const phase = getStepPipelinePhase(live);
    if (phase !== "complete") {
      return i;
    }
  }
  return Math.max(0, rowCount - 1);
}

/** Progress bar segment: pending, done without usable score, or score band (0–33 / 34–66 / 67–100). */
export type StepSegmentTone = "pending" | "neutral" | "low" | "mid" | "high";

export function getStepSegmentTone(live: RunStepRow | undefined): StepSegmentTone {
  const phase = getStepPipelinePhase(live);
  if (phase !== "complete") {
    return "pending";
  }
  const j = live?.judge;
  if (!j || j.failed) {
    return "neutral";
  }
  const score = j.score;
  if (score == null) {
    return "neutral";
  }
  const s = Math.max(0, Math.min(100, score));
  if (s <= 33) {
    return "low";
  }
  if (s <= 66) {
    return "mid";
  }
  return "high";
}
