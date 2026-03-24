"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { SessionAttackTestStreamHostProps } from "@/components/test-run/types";
import {
  abortAttackTestStreamForSession,
  resetAttackTestRunStreamState,
  startAttackTestStream,
} from "@/lib/test-run/attack-test-run-stream";
import { useLiveTestRunStore } from "@/lib/stores/live-test-run-store";
import {
  clearTestRunLaunchSessionStorage,
  consumeTestRunLaunchFromSessionStorage,
  useTestRunLaunchStore,
} from "@/lib/stores/test-run-launch-store";

export function SessionAttackTestStreamHost({ sessionId }: SessionAttackTestStreamHostProps) {
  const pathname = usePathname();
  const prevSidRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevSidRef.current !== null && prevSidRef.current !== sessionId) {
      abortAttackTestStreamForSession(prevSidRef.current);
      resetAttackTestRunStreamState();
      useLiveTestRunStore.getState().resetForSessionLeave();
    }
    prevSidRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const inSession = pathname.startsWith(`/sessions/${sessionId}`);
    if (!inSession) {
      abortAttackTestStreamForSession(sessionId);
      resetAttackTestRunStreamState();
      useLiveTestRunStore.getState().resetForSessionLeave();
    }
  }, [pathname, sessionId]);

  useEffect(() => {
    if (!pathname?.includes(`/sessions/${sessionId}/run`)) {
      return;
    }
    const fromStore = useTestRunLaunchStore.getState().consumeIfSession(sessionId);
    let launch = fromStore;
    if (!launch) {
      launch = consumeTestRunLaunchFromSessionStorage(sessionId);
    } else {
      clearTestRunLaunchSessionStorage(sessionId);
    }
    if (!launch) {
      return;
    }
    void startAttackTestStream(sessionId, launch);
  }, [sessionId, pathname]);

  return null;
}
