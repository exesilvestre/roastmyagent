"use client";

import { useParams } from "next/navigation";
import { useLayoutEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TestRunPanel } from "@/components/test-run/TestRunPanel";
import { useSessionStore } from "@/lib/stores/session-store";
import type { TestRunLaunchPayload } from "@/lib/stores/test-run-launch-store";
import {
  clearTestRunLaunchSessionStorage,
  consumeTestRunLaunchFromSessionStorage,
  useTestRunLaunchStore,
} from "@/lib/stores/test-run-launch-store";

export default function SessionRunPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const sessions = useSessionStore((s) => s.sessions);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const [launch] = useState<TestRunLaunchPayload | null>(() => {
    const fromStore = useTestRunLaunchStore.getState().consumeIfSession(sessionId);
    if (fromStore) {
      clearTestRunLaunchSessionStorage(sessionId);
      return fromStore;
    }
    return consumeTestRunLaunchFromSessionStorage(sessionId);
  });

  useLayoutEffect(() => {
    setActiveSession(sessionId);
  }, [sessionId, setActiveSession]);

  const title = useMemo(
    () => sessions.find((s) => s.id === sessionId)?.title ?? null,
    [sessions, sessionId],
  );

  return (
    <AppShell sidebarMode="sessionTests" sessionTestSidebarId={sessionId} testSessionChrome>
      <TestRunPanel sessionId={sessionId} sessionTitle={title} launch={launch} />
    </AppShell>
  );
}
