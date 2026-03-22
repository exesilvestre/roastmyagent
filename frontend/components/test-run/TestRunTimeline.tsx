"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { TestRunStepStrip } from "@/components/test-run/TestRunStepStrip";
import { TestRunStepCanvas } from "@/components/test-run/TestRunStepCanvas";
import {
  findLiveFocusIndex,
  getStepPipelinePhase,
  getStepSegmentTone,
} from "@/lib/test-run/stepPipelineStatus";
import type { RunStepRow } from "@/lib/test-run/types";
import "./styles.css";

export type { RunStepRow };

type TestRunTimelineProps = {
  sessionTitle: string | null;
  sessionId: string;
  totalSteps: number;
  summary: { ok: number; fail: number } | null;
  displaySteps: RunStepRow[];
  liveByIndex: Record<number, RunStepRow | undefined>;
  fatalError: string | null;
  phase: "running" | "done" | "error" | "no_launch";
  showProgressRing?: boolean;
  /** Slimmer layout for history detail column. */
  variant?: "page" | "embedded";
};

export function TestRunTimeline({
  sessionTitle,
  sessionId,
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
          strokeDasharray={97.4}
          strokeDashoffset={97.4 * (1 - progress)}
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
            const segClass =
              tone === "pending"
                ? "testRun_seg"
                : tone === "neutral"
                  ? "testRun_seg testRun_segNeutral"
                  : tone === "low"
                    ? "testRun_seg testRun_segScoreLow"
                    : tone === "mid"
                      ? "testRun_seg testRun_segScoreMid"
                      : "testRun_seg testRun_segScoreHigh";
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
            <TestRunStepCanvas step={selectedStep} live={selectedLive} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
