"use client";

import { Suspense, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AgentDescriptionModal } from "./AgentDescriptionModal";
import { SessionSidebar } from "@/components/sessions/session-sidebar";
import { SessionTestRunsSidebar } from "@/components/test-run/SessionTestRunsSidebar";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import { useSessionStore } from "@/lib/stores/session-store";
import type { AppShellProps } from "./types";
import "./styles.css";

const AGENT_DESC_PREVIEW_LEN = 300;

function truncateAgentDescription(text: string, max = AGENT_DESC_PREVIEW_LEN): string {
  const t = text.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max)}…`;
}

export function AppShell({
  children,
  sidebarMode = "sessions",
  sessionTestSidebarId,
  testSessionChrome = false,
}: AppShellProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const fetchProviders = useLlmProviderStore((s) => s.fetchProviders);
  const active = sessions.find((s) => s.id === activeSessionId);
  const [agentDescModalOpen, setAgentDescModalOpen] = useState(false);

  useEffect(() => {
    void fetchSessions().catch(() => {});
    void fetchProviders().catch(() => {});
  }, [fetchSessions, fetchProviders]);

  return (
    <div className={testSessionChrome ? "appShell appShell_viewportLocked" : "appShell"}>
      <AppHeader />
      <div className="appShell_panels">
        <div
          className={
            sidebarMode === "sessionTests" && sessionTestSidebarId
              ? "appShell_sidebarWrap appShell_sidebarWrapTestHistory"
              : "appShell_sidebarWrap"
          }
        >
          {sidebarMode === "sessionTests" && sessionTestSidebarId ? (
            <Suspense
              fallback={
                <aside className="appShell_sidebar appShell_sidebarFallback" aria-busy="true">
                  <p className="appShell_sidebarFallbackText">Loading…</p>
                </aside>
              }
            >
              <SessionTestRunsSidebar sessionId={sessionTestSidebarId} />
            </Suspense>
          ) : (
            <SessionSidebar className="appShell_sidebar" />
          )}
        </div>
        <main
          className={
            testSessionChrome ? "appShell_main appShell_mainTestSession" : "appShell_main"
          }
        >
          {active ? (
            <>
              {!testSessionChrome ? (
                <>
                  <h1 className="appShell_title">{active.title}</h1>
                  <p className="appShell_subtitle">
                    Session · updated{" "}
                    {new Date(active.updatedAt).toLocaleString()}
                  </p>
                  <section className="appShell_agent" aria-label="Agent context">
                    <h2 className="appShell_agentTitle">About this agent</h2>
                    {active.agentDescription?.trim() ? (
                      <button
                        type="button"
                        className="appShell_agentPreviewBtn"
                        onClick={() => setAgentDescModalOpen(true)}
                      >
                        <span className="appShell_agentPreviewText">
                          {truncateAgentDescription(active.agentDescription)}
                        </span>
                        <span className="appShell_agentPreviewHint">View or edit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="appShell_agentEmptyBtn"
                        onClick={() => setAgentDescModalOpen(true)}
                      >
                        Add a description…
                      </button>
                    )}
                  </section>
                  <AgentDescriptionModal
                    open={agentDescModalOpen}
                    sessionId={active.id}
                    initialDescription={active.agentDescription ?? ""}
                    onClose={() => setAgentDescModalOpen(false)}
                  />
                </>
              ) : null}
              <div
                className={testSessionChrome ? "appShell_body appShell_bodyTestSession" : "appShell_body"}
              >
                {children}
              </div>
            </>
          ) : (
            <div className="appShell_empty">
              <p className="appShell_emptyText">Select or create a test session.</p>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
