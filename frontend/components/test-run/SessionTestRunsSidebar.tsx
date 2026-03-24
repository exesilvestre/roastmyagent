"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatRunWhen } from "@/components/test-run/helpers";
import type { SessionTestRunsSidebarProps } from "@/components/test-run/types";
import { fetchAttackTestRuns } from "@/lib/api/attackTestRuns";
import { useLiveTestRunStore } from "@/lib/stores/live-test-run-store";
import "@/components/test-run/test-runs-history.css";
import "./session-test-runs-sidebar.css";

export function SessionTestRunsSidebar({ sessionId }: SessionTestRunsSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runFromUrl = searchParams.get("run");

  const [list, setList] = useState<Awaited<ReturnType<typeof fetchAttackTestRuns>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamingSessionId = useLiveTestRunStore((s) => s.streamingSessionId);
  const lastSavedRunId = useLiveTestRunStore((s) => s.lastSavedRunId);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAttackTestRuns(sessionId);
      setList(rows);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to load test runs";
      const msg =
        raw === "Failed to fetch"
          ? "Couldn’t reach the API. Check NEXT_PUBLIC_API_URL and that the backend is running."
          : raw;
      setError(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const loadListRef = useRef(loadList);
  loadListRef.current = loadList;

  useEffect(() => {
    void loadListRef.current();
  }, [sessionId]);

  /** Refetch when navigating from live run to tests (e.g. after a run was saved). */
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname ?? null;
    if (prev !== null && prev.includes("/run") && (pathname ?? "").includes("/tests")) {
      void loadListRef.current();
    }
  }, [pathname]);

  useEffect(() => {
    if (!lastSavedRunId || streamingSessionId !== sessionId) {
      return;
    }
    void loadListRef.current();
  }, [lastSavedRunId, streamingSessionId, sessionId]);

  const testsPath = `/sessions/${sessionId}/tests`;
  const onTestsPage = pathname === testsPath || pathname?.endsWith("/tests");

  const savedRunNowInList =
    lastSavedRunId != null && list.some((r) => r.id === lastSavedRunId);
  const showLivePlaceholder =
    streamingSessionId === sessionId && !savedRunNowInList;

  return (
    <aside
      className="sessionTestRunsSidebar testRunsHistory_listCol appShell_sidebar"
      aria-label="Saved test runs for this session"
    >
      <div className="sessionTestRunsSidebar_top">
        <Link href="/" className="sessionTestRunsSidebar_back">
          &lt; Prompts
        </Link>
        <p className="sessionTestRunsSidebar_hint">
          Switch session: go to Prompts, then pick another in the sidebar.
        </p>
      </div>
      <div className="sessionTestRunsSidebar_heading">Test history</div>
      {showLivePlaceholder ? (
        <div
          className="sessionTestRunsSidebar_liveCard"
          role="status"
          aria-live="polite"
        >
          <span className="sessionTestRunsSidebar_liveBadge">Live</span>
          <span className="sessionTestRunsSidebar_liveTitle">Current run</span>
          <span className="sessionTestRunsSidebar_liveSub">
            {lastSavedRunId ? "Saving to history…" : "In progress…"}
          </span>
        </div>
      ) : null}
      {loading ? (
        <p className="testRunsHistory_muted">Loading…</p>
      ) : error ? (
        <p className="testRunsHistory_err" role="alert">
          {error}
        </p>
      ) : list.length === 0 && !showLivePlaceholder ? (
        <p className="testRunsHistory_muted">
          No saved runs yet. When a test finishes and is saved, it will appear here.
        </p>
      ) : list.length > 0 ? (
        <ul className="testRunsHistory_list">
          {list.map((run) => {
            const active = onTestsPage && runFromUrl === run.id;
            return (
              <li key={run.id}>
                <Link
                  href={`${testsPath}?run=${run.id}`}
                  className={
                    active
                      ? "sessionTestRunsSidebar_card testRunsHistory_card testRunsHistory_cardActive"
                      : "sessionTestRunsSidebar_card testRunsHistory_card"
                  }
                >
                  <span className="testRunsHistory_cardTime">{formatRunWhen(run.createdAt)}</span>
                  <span className="testRunsHistory_cardMeta">
                    {run.totalSteps} steps · delay {run.delaySeconds}s
                  </span>
                  <span className="testRunsHistory_cardStats">
                    <span className="testRunsHistory_statOk">{run.okCount} OK</span>
                    <span className="testRunsHistory_statSep">·</span>
                    <span className="testRunsHistory_statFail">{run.failCount} fail</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
