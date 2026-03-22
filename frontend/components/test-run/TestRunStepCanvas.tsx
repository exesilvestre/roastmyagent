"use client";

import { useState } from "react";
import { TestRunTextModal } from "@/components/test-run/TestRunTextModal";
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
  step: RunStepRow | undefined;
  live: RunStepRow | undefined;
};

type TextModalState = { title: string; body: string } | null;

export function TestRunStepCanvas({ step, live }: TestRunStepCanvasProps) {
  const [textModal, setTextModal] = useState<TextModalState>(null);

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
                  {step.judge.constraintSummary ? (
                    <button
                      type="button"
                      className="testRun_reasoningHit appScroll"
                      onClick={() =>
                        setTextModal({
                          title: "Constraint brief",
                          body: step.judge!.constraintSummary!,
                        })
                      }
                    >
                      <p className="testRun_reasoningInner">{step.judge.constraintSummary}</p>
                      <span className="testRun_previewHint">Click to expand</span>
                    </button>
                  ) : null}
                  {step.judge.reasoning ? (
                    <button
                      type="button"
                      className="testRun_reasoningHit appScroll"
                      onClick={() =>
                        setTextModal({ title: "Judge reasoning", body: step.judge!.reasoning! })
                      }
                    >
                      <p className="testRun_reasoningInner">{step.judge.reasoning}</p>
                      <span className="testRun_previewHint">Click to expand</span>
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
