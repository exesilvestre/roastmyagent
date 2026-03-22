import type { RunStepRow } from "@/lib/test-run/types";
import { getStepPipelinePhase, type StepPipelinePhase } from "@/lib/test-run/stepPipelineStatus";

function phaseStripClass(phase: StepPipelinePhase): string {
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

type TestRunStepStripProps = {
  displaySteps: RunStepRow[];
  liveByIndex: Record<number, RunStepRow | undefined>;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
};

export function TestRunStepStrip({
  displaySteps,
  liveByIndex,
  selectedIndex,
  onSelectIndex,
}: TestRunStepStripProps) {
  return (
    <div className="testRun_strip" role="tablist" aria-label="Test steps">
      <div className="testRun_stripTrack">
        {displaySteps.map((step, i) => {
          const live = liveByIndex[i];
          const phase = getStepPipelinePhase(live);
          const active = selectedIndex === i;
          return (
            <button
              key={step.index}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Step ${i + 1}`}
              title={`Step ${i + 1}`}
              className={
                active
                  ? `testRun_stripBtn testRun_stripBtnActive ${phaseStripClass(phase)}`
                  : `testRun_stripBtn ${phaseStripClass(phase)}`
              }
              onClick={() => onSelectIndex(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
