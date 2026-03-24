import { phaseStripClass } from "@/components/test-run/helpers";
import type { TestRunStepStripProps } from "@/components/test-run/types";
import { getStepPipelinePhase } from "@/lib/test-run/stepPipelineStatus";

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
