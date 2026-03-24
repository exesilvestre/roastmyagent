"use client";

import { useParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TestRunPanel } from "@/components/test-run/TestRunPanel";
import { useSessionStore } from "@/lib/stores/session-store";

export default function SessionRunPage() {
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
      <TestRunPanel sessionId={sessionId} sessionTitle={title} />
    </AppShell>
  );
}
