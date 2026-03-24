"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import {
  downloadAttackTestRunExcel,
  fetchAttackTestRunDetail,
} from "@/lib/api/attackTestRuns";
import type { AttackPromptsListApi, AttackTestStreamEvent } from "@/lib/api/types";
import { formatRunWhen } from "@/components/test-run/helpers";
import { TestRunTimeline } from "@/components/test-run/TestRunTimeline";
import type { TestRunDetailMeta, TestRunsHistoryProps } from "@/components/test-run/types";
import { foldAttackTestEvents } from "@/lib/test-run/foldEvents";
import { mergeDisplaySteps } from "@/lib/test-run/mergeDisplaySteps";
import { appToast } from "@/lib/app-toast";
import "./test-runs-history.css";

export function TestRunsHistory({ sessionId, sessionTitle }: TestRunsHistoryProps) {
  const searchParams = useSearchParams();
  const runFromUrl = searchParams.get("run");

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailEvents, setDetailEvents] = useState<AttackTestStreamEvent[] | null>(null);
  const [detailMeta, setDetailMeta] = useState<TestRunDetailMeta | null>(null);
  const [promptTextById, setPromptTextById] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

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

  const loadDetail = useCallback(
    async (runId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      setDetailEvents(null);
      setDetailMeta(null);
      try {
        const d = await fetchAttackTestRunDetail(sessionId, runId);
        setDetailEvents(d.events as AttackTestStreamEvent[]);
        setDetailMeta({
          createdAt: d.createdAt,
          delaySeconds: d.delaySeconds,
        });
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : "Failed to load run");
      } finally {
        setDetailLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (!runFromUrl) {
      setDetailEvents(null);
      setDetailMeta(null);
      setDetailError(null);
      return;
    }
    void loadDetail(runFromUrl);
  }, [runFromUrl, loadDetail]);

  const folded = useMemo(() => {
    if (!detailEvents) {
      return null;
    }
    return foldAttackTestEvents(detailEvents);
  }, [detailEvents]);

  const handleExportExcel = useCallback(async () => {
    if (!runFromUrl) {
      return;
    }
    setExporting(true);
    try {
      await downloadAttackTestRunExcel(sessionId, runFromUrl);
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [sessionId, runFromUrl]);

  const displaySteps = useMemo(() => {
    if (!folded || folded.totalSteps === 0) {
      return [];
    }
    return mergeDisplaySteps({
      rowCount: folded.totalSteps,
      byIndex: folded.byIndex,
      promptTextById,
    });
  }, [folded, promptTextById]);

  return (
    <div className="testRunsHistory testRunsHistory_embed">
      <div className="testRunsHistory_bg" aria-hidden />
      <header className="testRunsHistory_header testRunsHistory_headerEmbed">
        <h3 className="testRunsHistory_title">Test results</h3>
        <p className="testRunsHistory_sub">{sessionTitle ?? sessionId}</p>
      </header>

      <section className="testRunsHistory_detailOnly" aria-label="Run detail">
        {!runFromUrl ? (
          <div className="testRunsHistory_empty">
            <p className="testRunsHistory_emptyTitle">Select a saved run</p>
            <p className="testRunsHistory_muted">
              Pick a run in the left sidebar, or start a new test from Prompts.
            </p>
          </div>
        ) : null}

        {runFromUrl && detailLoading ? (
          <p className="testRunsHistory_muted">Loading run…</p>
        ) : null}

        {detailError ? <p className="testRunsHistory_err">{detailError}</p> : null}

        {runFromUrl && folded && !detailLoading && !detailError ? (
          <div className="testRunsHistory_detailInner">
            {detailMeta ? (
              <div className="testRunsHistory_detailMetaRow">
                <p className="testRunsHistory_detailMeta">
                  {formatRunWhen(detailMeta.createdAt)} · delay {detailMeta.delaySeconds}s
                </p>
                <button
                  type="button"
                  className="testRunsHistory_exportBtn"
                  disabled={exporting}
                  aria-label="Export run as Excel"
                  title="Export as Excel"
                  onClick={() => void handleExportExcel()}
                >
                  {exporting ? "…" : "Excel"}
                </button>
              </div>
            ) : null}
            <TestRunTimeline
              sessionId={sessionId}
              sessionTitle={sessionTitle}
              runId={runFromUrl}
              totalSteps={folded.totalSteps}
              summary={folded.summary}
              displaySteps={displaySteps}
              liveByIndex={folded.byIndex}
              fatalError={folded.fatalError}
              phase="done"
              showProgressRing={false}
              variant="embedded"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
