"use client";

import { useState } from "react";
import { TestRunTextModal, type TestRunModalSection } from "@/components/test-run/TestRunTextModal";
import { postAttackSuggestions } from "@/lib/api/attackTestStream";
import { formatConstraintBrief } from "@/lib/test-run/formatConstraintBrief";
import type { RunStepRow } from "@/lib/test-run/types";
import { getStepPipelinePhase } from "@/lib/test-run/stepPipelineStatus";

function verdictClass(verdict: string | null | undefined): string {
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

type TestRunStepCanvasProps = {
  sessionId: string;
  runId: string | null;
  step: RunStepRow | undefined;
  live: RunStepRow | undefined;
};

type TextModalState = {
  title: string;
  body: string;
  sections?: TestRunModalSection[];
} | null;

function validationBriefBody(judge: NonNullable<RunStepRow["judge"]>): string | null {
  const d = judge.judgeConstraintSummary;
  if (d && typeof d === "object" && Object.keys(d).length > 0) {
    const t = formatConstraintBrief(d).trim();
    return t || null;
  }
  const legacy = judge.constraintSummary?.trim();
  return legacy || null;
}

export function TestRunStepCanvas({ sessionId, runId, step, live }: TestRunStepCanvasProps) {
  const [textModal, setTextModal] = useState<TextModalState>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  if (!step) {
    return (
      <div className="testRun_canvasEmpty">
        <p className="testRun_canvasEmptyText">No step selected.</p>
      </div>
    );
  }

  const phase = getStepPipelinePhase(live);
  const agentPulse = phase === "agent_running";
  const judgePulse = phase === "judging";
  const agentDone = !!step.agent;
  const judgeDone = !!step.judge && !step.judgePending;

  const promptLine =
    (step.promptText ?? "").trim() ||
    (step.intent ?? "").trim() ||
    "";

  return (
    <div className="testRun_canvas testRun_canvasCompact">
      <TestRunTextModal
        open={textModal !== null}
        title={textModal?.title ?? ""}
        body={textModal?.body ?? ""}
        sections={textModal?.sections}
        onClose={() => setTextModal(null)}
      />
      <div className="testRun_canvasHead">
        <span className="testRun_canvasHeadNum">#{step.index + 1}</span>
        {step.category ? <span className="testRun_chip testRun_chipSm">{step.category}</span> : null}
      </div>
      {promptLine ? (
        <p className="testRun_canvasPrompt" title={promptLine}>
          {promptLine.length > 220 ? `${promptLine.slice(0, 217)}…` : promptLine}
        </p>
      ) : null}

      <div className="testRun_flow testRun_flowCompact">
        <div
          className={
            agentPulse
              ? "testRun_node testRun_nodeAgent testRun_nodePulse testRun_nodeCompact"
              : agentDone
                ? "testRun_node testRun_nodeAgent testRun_nodeDone testRun_nodeCompact"
                : "testRun_node testRun_nodeAgent testRun_nodeIdle testRun_nodeCompact"
          }
        >
          <div className="testRun_nodeLabel">Agent</div>
          {phase === "queued" && !live ? (
            <p className="testRun_nodeWait">Waiting for turn…</p>
          ) : null}
          {phase === "agent_running" ? (
            <p className="testRun_nodeWait testRun_nodeWaitStrong">Request in flight…</p>
          ) : null}
          {step.agent ? (
            <>
              <div className="testRun_badges">
                <span
                  className={
                    step.agent.ok ? "testRun_badge testRun_badgeOk" : "testRun_badge testRun_badgeFail"
                  }
                >
                  {step.agent.ok ? "HTTP OK" : "HTTP failed"}
                </span>
                {step.agent.statusCode != null ? (
                  <span className="testRun_badge testRun_badgeNeutral">{step.agent.statusCode}</span>
                ) : null}
              </div>
              {step.agent.detail ? <p className="testRun_detail">{step.agent.detail}</p> : null}
              {step.agent.responsePreview ? (
                <button
                  type="button"
                  className="testRun_previewHit appScroll"
                  onClick={() =>
                    setTextModal({ title: "Agent response", body: step.agent!.responsePreview! })
                  }
                >
                  <pre className="testRun_previewInner">{step.agent.responsePreview}</pre>
                  <span className="testRun_previewHint">Click to expand</span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="testRun_flowConnector" aria-hidden>
          <span className="testRun_flowDash">----</span>
        </div>

        <div
          className={
            judgePulse
              ? "testRun_node testRun_nodeJudge testRun_nodePulse testRun_nodeCompact"
              : judgeDone
                ? "testRun_node testRun_nodeJudge testRun_nodeDone testRun_nodeCompact"
                : "testRun_node testRun_nodeJudge testRun_nodeIdle testRun_nodeCompact"
          }
        >
          <div className="testRun_nodeLabel">Judge</div>
          {step.judgePending ? (
            <p className="testRun_nodeWait testRun_nodeWaitStrong">Scoring response…</p>
          ) : null}
          {step.judge ? (
            <>
              {step.judge.failed ? (
                <p className="testRun_detail">{step.judge.error ?? "Judge failed"}</p>
              ) : (
                <>
                  <div className="testRun_judgeRow testRun_judgeRowCompact">
                    <span className="testRun_score testRun_scoreSm">{step.judge.score ?? "—"}</span>
                    {step.judge.verdict ? (
                      <span className={`testRun_verdict ${verdictClass(step.judge.verdict)}`}>
                        {step.judge.verdict}
                      </span>
                    ) : null}
                  </div>
                  {step.judge.reasoning?.trim() || validationBriefBody(step.judge) ? (
                    <button
                      type="button"
                      className="testRun_reasoningHit appScroll"
                      onClick={() => {
                        const j = step.judge!;
                        const sections: TestRunModalSection[] = [];
                        const brief = validationBriefBody(j);
                        if (brief) {
                          sections.push({
                            title: "What we validate",
                            body: brief,
                          });
                        }
                        if (j.reasoning?.trim()) {
                          sections.push({
                            title: "Judge reasoning",
                            body: j.reasoning.trim(),
                          });
                        }
                        if (sections.length === 0) {
                          return;
                        }
                        setTextModal({
                          title: "Judge",
                          body: "",
                          sections,
                        });
                      }}
                    >
                      {step.judge.reasoning?.trim() ? (
                        <p className="testRun_reasoningInner">{step.judge.reasoning}</p>
                      ) : (
                        <p className="testRun_reasoningInner testRun_judgeDetailsPlaceholder">
                          Validation summary (open to read)
                        </p>
                      )}
                      <span className="testRun_previewHint">Click to expand</span>
                    </button>
                  ) : null}
                  {step.judge.verdict === "vulnerable" ? (
                    <button
                      type="button"
                      className="testRun_suggestionsBtn"
                      disabled={isLoadingSuggestions || !runId}
                      onClick={async () => {
                        if (!runId) {
                          setTextModal({
                            title: "Security suggestions",
                            body: "Finish saving the test run first, then try again.",
                          });
                          return;
                        }
                        setIsLoadingSuggestions(true);
                        setTextModal({
                          title: "Security suggestions",
                          body: "Loading suggestions...",
                        });
                        try {
                          const data = await postAttackSuggestions(sessionId, runId, step.index);
                          setTextModal({
                            title: "Security suggestions",
                            body: data.suggestions || "No suggestions generated.",
                          });
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : "Failed to load suggestions.";
                          setTextModal({
                            title: "Security suggestions",
                            body: message,
                          });
                        } finally {
                          setIsLoadingSuggestions(false);
                        }
                      }}
                    >
                      {isLoadingSuggestions ? "Loading..." : "Request suggestions"}
                    </button>
                  ) : null}
                </>
              )}
            </>
          ) : !step.judgePending && step.agent && !step.judge ? (
            <p className="testRun_nodeWait">Waiting for judge…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
