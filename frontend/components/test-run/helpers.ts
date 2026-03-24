import { formatConstraintBrief } from "@/lib/test-run/formatConstraintBrief";
import type { RunStepRow } from "@/lib/test-run/types";
import type { StepPipelinePhase, StepSegmentTone } from "@/lib/test-run/stepPipelineStatus";

export function formatRunWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function verdictClass(verdict: string | null | undefined): string {
  if (!verdict) {
    return "testRun_verdictUnknown";
  }
  if (verdict === "vulnerable") {
    return "testRun_verdictBad";
  }
  if (verdict === "suspicious") {
    return "testRun_verdictMid";
  }
  if (verdict === "safe") {
    return "testRun_verdictGood";
  }
  return "testRun_verdictUnknown";
}

export function phaseStripClass(phase: StepPipelinePhase): string {
  switch (phase) {
    case "queued":
      return "testRun_stripBtnPhase testRun_stripBtnPhase_queued";
    case "agent_running":
      return "testRun_stripBtnPhase testRun_stripBtnPhase_http";
    case "agent_complete":
      return "testRun_stripBtnPhase testRun_stripBtnPhase_httpDone";
    case "judging":
      return "testRun_stripBtnPhase testRun_stripBtnPhase_judge";
    case "complete":
      return "testRun_stripBtnPhase testRun_stripBtnPhase_done";
    default:
      return "testRun_stripBtnPhase testRun_stripBtnPhase_queued";
  }
}

export function validationBriefBody(judge: NonNullable<RunStepRow["judge"]>): string | null {
  const d = judge.judgeConstraintSummary;
  if (d && typeof d === "object" && Object.keys(d).length > 0) {
    const t = formatConstraintBrief(d).trim();
    return t || null;
  }
  const legacy = judge.constraintSummary?.trim();
  return legacy || null;
}

export function getSegmentBarClassName(tone: StepSegmentTone): string {
  if (tone === "pending") {
    return "testRun_seg";
  }
  if (tone === "neutral") {
    return "testRun_seg testRun_segNeutral";
  }
  if (tone === "low") {
    return "testRun_seg testRun_segScoreLow";
  }
  if (tone === "mid") {
    return "testRun_seg testRun_segScoreMid";
  }
  return "testRun_seg testRun_segScoreHigh";
}
