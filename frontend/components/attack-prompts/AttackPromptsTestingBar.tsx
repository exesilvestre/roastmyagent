"use client";

import { COPY, DELAY_OPTIONS, TIMEOUT_MAX_SECONDS } from "./constants";
import { AttackPromptsTestingBarProps } from "./types";



export function AttackPromptsTestingBar({
  delaySeconds,
  onDelaySeconds,
  timeoutMode,
  onTimeoutSecondsMode,
  onTimeoutNoneMode,
  timeoutSecondsInput,
  onTimeoutSecondsInput,
  isTimeoutValid,
  busy,
  loadingList,
  canRunTest,
  dirty,
  selectedCount,
  onAddRow,
  onStartTesting,
}: AttackPromptsTestingBarProps) {
  return (
    <>
      <div className="attackPrompts_testingBar" aria-label="Run attack test">
        <div className="attackPrompts_testingBar_fields">
          <span className="attackPrompts_testingLabel" id="attack-delay-label">
            Delay between requests
          </span>
          <div
            className="attackPrompts_segmented"
            role="group"
            aria-labelledby="attack-delay-label"
          >
            {DELAY_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                className={
                  delaySeconds === sec
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={delaySeconds === sec}
                disabled={busy || loadingList}
                onClick={() => onDelaySeconds(sec)}
              >
                {sec}s
              </button>
            ))}
          </div>
          <div className="attackPrompts_timeoutControls">
            <span className="attackPrompts_testingLabel" id="attack-timeout-label">
              Agent request timeout
            </span>
            <div
              className="attackPrompts_segmented"
              role="group"
              aria-labelledby="attack-timeout-label"
            >
              <button
                type="button"
                className={
                  timeoutMode === "seconds"
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={timeoutMode === "seconds"}
                disabled={busy || loadingList}
                onClick={onTimeoutSecondsMode}
              >
                Timeout
              </button>
              <button
                type="button"
                className={
                  timeoutMode === "none"
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={timeoutMode === "none"}
                disabled={busy || loadingList}
                onClick={onTimeoutNoneMode}
              >
                No timeout
              </button>
            </div>
            <label className="attackPrompts_timeoutField" htmlFor="attack-timeout-seconds">
              <span className="attackPrompts_timeoutSuffix">seconds</span>
              <input
                id="attack-timeout-seconds"
                type="number"
                min={0}
                max={TIMEOUT_MAX_SECONDS}
                step={1}
                inputMode="numeric"
                className="attackPrompts_timeoutInput"
                value={timeoutSecondsInput}
                disabled={busy || loadingList}
                aria-invalid={!isTimeoutValid}
                onChange={(e) => onTimeoutSecondsInput(e.target.value)}
              />
            </label>
          </div>
          {!isTimeoutValid ? (
            <span className="attackPrompts_timeoutError">{COPY.timeoutInlineError}</span>
          ) : null}
        </div>
      </div>
      <div className="attackPrompts_testingBar_right">
        <button
          type="button"
          className="attackPrompts_btn attackPrompts_btnSecondary"
          disabled={busy || loadingList}
          onClick={onAddRow}
        >
          Add row
        </button>
        <button
          type="button"
          className="attackPrompts_btn attackPrompts_startTest"
          disabled={!canRunTest}
          title={
            dirty
              ? COPY.startTestTitleDirty
              : selectedCount === 0
                ? COPY.startTestTitleNoSelection
                : undefined
          }
          onClick={() => onStartTesting()}
        >
          Start testing
        </button>
      </div>
    </>
  );
}


// reviewed