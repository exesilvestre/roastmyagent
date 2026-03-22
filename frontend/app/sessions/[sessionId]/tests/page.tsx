"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TestRunsHistory } from "@/components/test-run/TestRunsHistory";
import { useSessionStore } from "@/lib/stores/session-store";

function TestsPageInner() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const sessions = useSessionStore((s) => s.sessions);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  useLayoutEffect(() => {
    setActiveSession(sessionId);
  }, [sessionId, setActiveSession]);

  const title = useMemo(
    () => sessions.find((s) => s.id === sessionId)?.title ?? null,
    [sessions, sessionId],
  );

  return (
    <AppShell sidebarMode="sessionTests" sessionTestSidebarId={sessionId} testSessionChrome>
      <TestRunsHistory sessionId={sessionId} sessionTitle={title} />
    </AppShell>
  );
}

export default function SessionTestsPage() {
  return (
    <Suspense fallback={<p className="m-0 text-[var(--muted-foreground)] text-sm">Loading…</p>}>
      <TestsPageInner />
    </Suspense>
  );
}
