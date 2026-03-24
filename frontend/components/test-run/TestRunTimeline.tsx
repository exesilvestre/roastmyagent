"use client";

import { useEffect, useMemo, useState } from "react";
import { TEST_RUN_RING_STROKE_LENGTH } from "@/components/test-run/constants";
import { getSegmentBarClassName } from "@/components/test-run/helpers";
import { TestRunStepStrip } from "@/components/test-run/TestRunStepStrip";
import { TestRunStepCanvas } from "@/components/test-run/TestRunStepCanvas";
import type { TestRunTimelineProps } from "@/components/test-run/types";
import {
  findLiveFocusIndex,
  getStepPipelinePhase,
  getStepSegmentTone,
} from "@/lib/test-run/stepPipelineStatus";
import "./styles.css";

export function TestRunTimeline({
  sessionTitle,
  sessionId,
  runId,
  totalSteps,
  summary,
  displaySteps,
  liveByIndex,
  fatalError,
  phase,
  showProgressRing = true,
  variant = "page",
}: TestRunTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const rowCount = displaySteps.length;

  useEffect(() => {
    if (rowCount === 0) {
      return;
    }
    setSelectedIndex((i) => Math.min(i, rowCount - 1));
  }, [rowCount]);

  useEffect(() => {
    if (phase !== "running" || rowCount === 0) {
      return;
    }
    setSelectedIndex(findLiveFocusIndex(liveByIndex, rowCount));
  }, [phase, liveByIndex, rowCount]);

  const progress = useMemo(() => {
    if (totalSteps <= 0) {
      return 0;
    }
    const done = displaySteps.filter((_, i) => getStepPipelinePhase(liveByIndex[i]) === "complete")
      .length;
    return Math.min(1, done / totalSteps);
  }, [displaySteps, liveByIndex, totalSteps]);

  const selectedStep = displaySteps[selectedIndex];
  const selectedLive = liveByIndex[selectedIndex];

  const embedded = variant === "embedded";

  const ring = showProgressRing ? (
    <div className="testRun_ringWrap" aria-hidden>
      <svg className="testRun_ringSvg" viewBox="0 0 36 36">
        <circle className="testRun_ringTrack" cx="18" cy="18" r="15.5" />
        <circle
          className="testRun_ringProg"
          cx="18"
          cy="18"
          r="15.5"
          strokeDasharray={TEST_RUN_RING_STROKE_LENGTH}
          strokeDashoffset={TEST_RUN_RING_STROKE_LENGTH * (1 - progress)}
        />
      </svg>
      <span className="testRun_ringLabel">
        {totalSteps > 0 ? `${Math.round(progress * 100)}%` : "—"}
      </span>
    </div>
  ) : null;

  const showHero = !embedded || showProgressRing;

  return (
    <div className={embedded ? "testRun testRun_embedded" : "testRun"}>
      {!embedded ? <div className="testRun_bg" aria-hidden /> : null}
      {showHero ? (
        <div className={embedded ? "testRun_hero testRun_heroCompact" : "testRun_hero"}>
          {!embedded ? (
            <div className="testRun_heroTop">
              <div className="testRun_heroTitleBlock">
                <h2 className="testRun_title">Test run</h2>
                <p className="testRun_sub">
                  {sessionTitle ?? sessionId}
                  {phase === "running" ? " · live" : null}
                </p>
              </div>
              {ring}
            </div>
          ) : (
            <div className="testRun_heroTop testRun_heroTop_embedded">{ring}</div>
          )}
        </div>
      ) : null}

      {fatalError ? <p className="testRun_fatal">{fatalError}</p> : null}

      {summary && phase !== "running" ? (
        <p className="testRun_summary">
          HTTP: <strong>{summary.ok}</strong> ok, <strong>{summary.fail}</strong> failed
        </p>
      ) : null}

      {totalSteps > 0 ? (
        <div className="testRun_segBar" aria-hidden>
          {Array.from({ length: totalSteps }, (_, i) => {
            const tone = getStepSegmentTone(liveByIndex[i]);
            const segClass = getSegmentBarClassName(tone);
            return <span key={i} className={segClass} title={`Step ${i + 1}`} />;
          })}
        </div>
      ) : null}

      {phase === "running" && rowCount === 0 && !fatalError ? (
        <p className="testRun_empty">Connecting…</p>
      ) : null}

      {rowCount > 0 ? (
        <div className="testRun_detailLayout">
          <TestRunStepStrip
            displaySteps={displaySteps}
            liveByIndex={liveByIndex}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
          <div className="testRun_canvasWrap testRun_canvasWrapFull">
            <TestRunStepCanvas
              sessionId={sessionId}
              runId={runId ?? null}
              step={selectedStep}
              live={selectedLive}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
