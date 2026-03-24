"use client";

import { useMemo } from "react";
import { useLiveTestRunStore } from "@/lib/stores/live-test-run-store";
import { useAttackTestRunStreamState } from "@/lib/test-run/attack-test-run-stream";
import { TestRunTimeline } from "@/components/test-run/TestRunTimeline";
import type { TestRunPanelProps } from "@/components/test-run/types";
import { displayRowCount, mergeDisplaySteps } from "@/lib/test-run/mergeDisplaySteps";
import "./styles.css";

export function TestRunPanel({ sessionId, sessionTitle }: TestRunPanelProps) {
  const {
    launch,
    phase,
    totalSteps,
    summary,
    byIndex,
    fatalError,
    promptTextById,
  } = useAttackTestRunStreamState();
  const lastSavedRunId = useLiveTestRunStore((s) => s.lastSavedRunId);

  const rowCount = useMemo(
    () =>
      displayRowCount({
        totalSteps,
        plannedPrompts: launch?.plannedPrompts,
        promptIds: launch?.promptIds,
      }),
    [totalSteps, launch?.plannedPrompts, launch?.promptIds],
  );

  const displaySteps = useMemo(
    () =>
      mergeDisplaySteps({
        rowCount,
        plannedPrompts: launch?.plannedPrompts,
        promptIds: launch?.promptIds,
        byIndex,
        promptTextById,
      }),
    [rowCount, launch?.plannedPrompts, launch?.promptIds, byIndex, promptTextById],
  );

  if (phase === "idle" && !launch) {
    return (
      <div className="testRun">
        <div className="testRun_hero testRun_heroMuted">
          <h2 className="testRun_title">No test queued</h2>
          <p className="testRun_sub">
            Start a test from adversarial prompts for this session, or pick another session.
          </p>
        </div>
      </div>
    );
  }

  const timelinePhase: "running" | "done" | "error" =
    phase === "idle" ? "running" : phase;

  return (
    <TestRunTimeline
      sessionId={sessionId}
      sessionTitle={sessionTitle}
      runId={lastSavedRunId}
      totalSteps={totalSteps}
      summary={summary}
      displaySteps={displaySteps}
      liveByIndex={byIndex}
      fatalError={fatalError}
      phase={timelinePhase}
    />
  );
}
