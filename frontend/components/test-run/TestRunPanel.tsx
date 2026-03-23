"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { postAttackTestStream } from "@/lib/api/attackTestStream";
import type { AttackPromptsListApi, AttackTestStreamEvent } from "@/lib/api/types";
import { useLiveTestRunStore } from "@/lib/stores/live-test-run-store";
import type { TestRunLaunchPayload } from "@/lib/stores/test-run-launch-store";
import { TestRunTimeline } from "@/components/test-run/TestRunTimeline";
import { displayRowCount, mergeDisplaySteps } from "@/lib/test-run/mergeDisplaySteps";
import type { RunStepRow } from "@/lib/test-run/types";
import "./styles.css";

type TestRunPanelProps = {
  sessionId: string;
  sessionTitle: string | null;
  launch: TestRunLaunchPayload | null;
};

export function TestRunPanel({ sessionId, sessionTitle, launch }: TestRunPanelProps) {
  const [phase, setPhase] = useState<"running" | "done" | "error" | "no_launch">(
    launch ? "running" : "no_launch",
  );
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [summary, setSummary] = useState<{ ok: number; fail: number } | null>(null);
  const [byIndex, setByIndex] = useState<Record<number, RunStepRow>>({});
  const [promptTextById, setPromptTextById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void apiFetch<AttackPromptsListApi>(`/api/v1/sessions/${sessionId}/attack-prompts`)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const m: Record<string, string> = {};
        for (const p of data.prompts) {
          m[p.id] = p.promptText;
        }
        setPromptTextById(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const applyEvent = useCallback((ev: AttackTestStreamEvent) => {
    switch (ev.event) {
      case "run_started":
        setTotalSteps(ev.totalSteps);
        setByIndex({});
        setSummary(null);
        setFatalError(null);
        break;
      case "step_started":
        setByIndex((prev) => ({
          ...prev,
          [ev.index]: {
            ...prev[ev.index],
            index: ev.index,
            promptId: ev.promptId,
            category: ev.category,
            intent: ev.intent,
          },
        }));
        break;
      case "agent_finished":
        setByIndex((prev) => ({
          ...prev,
          [ev.index]: {
            ...prev[ev.index],
            index: ev.index,
            agent: {
              ok: ev.ok,
              statusCode: ev.statusCode,
              detail: ev.detail,
              responsePreview: ev.responsePreview,
            },
          },
        }));
        break;
      case "judge_started":
        setByIndex((prev) => ({
          ...prev,
          [ev.index]: {
            ...prev[ev.index],
            index: ev.index,
            judgePending: true,
          },
        }));
        break;
      case "judge_finished":
        setByIndex((prev) => ({
          ...prev,
          [ev.index]: {
            ...prev[ev.index],
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
          },
        }));
        break;
      case "run_finished":
        setSummary({ ok: ev.okCount, fail: ev.failCount });
        setPhase("done");
        break;
      case "run_saved":
        useLiveTestRunStore.getState().setRunSaved(ev.runId);
        break;
      case "error":
        setFatalError(ev.message);
        setPhase("error");
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (!launch) {
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      useLiveTestRunStore.getState().setStreaming(sessionId);
      setPhase("running");
      setFatalError(null);
      setByIndex({});
      setSummary(null);
      setTotalSteps(0);
      try {
        await postAttackTestStream(
          sessionId,
          { promptIds: launch.promptIds, delaySeconds: launch.delaySeconds },
          (ev) => {
            applyEvent(ev);
          },
          ac.signal,
        );
        setPhase((p) => (p === "error" ? p : "done"));
      } catch (e) {
        if (ac.signal.aborted) {
          return;
        }
        const msg = e instanceof Error ? e.message : "Stream failed";
        setFatalError(msg);
        setPhase("error");
      }
    };

    void run();

    return () => {
      ac.abort();
      useLiveTestRunStore.getState().clearStreaming();
    };
  }, [sessionId, launch, applyEvent]);

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

  if (phase === "no_launch") {
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

  return (
    <TestRunTimeline
      sessionId={sessionId}
      sessionTitle={sessionTitle}
      totalSteps={totalSteps}
      summary={summary}
      displaySteps={displaySteps}
      liveByIndex={byIndex}
      fatalError={fatalError}
      phase={phase}
    />
  );
}
