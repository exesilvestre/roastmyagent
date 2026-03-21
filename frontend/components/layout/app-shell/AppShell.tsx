"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SessionSidebar } from "@/components/sessions/session-sidebar";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import { useSessionStore } from "@/lib/stores/session-store";
import type { AppShellProps } from "./types";
import "./styles.css";

export function AppShell({ children }: AppShellProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const fetchProviders = useLlmProviderStore((s) => s.fetchProviders);
  const active = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    void fetchSessions();
    void fetchProviders();
  }, [fetchSessions, fetchProviders]);

  return (
    <div className="appShell">
      <AppHeader />
      <div className="appShell_panels">
        <div className="appShell_sidebarWrap">
          <SessionSidebar className="appShell_sidebar" />
        </div>
        <main className="appShell_main">
          {active ? (
            <>
              <h1 className="appShell_title">{active.title}</h1>
              <p className="appShell_subtitle">
                Session · {active.status} · updated{" "}
                {new Date(active.updatedAt).toLocaleString()}
              </p>
              {active.agentDescription ? (
                <section className="appShell_agent" aria-label="Agent context">
                  <h2 className="appShell_agentTitle">About this agent</h2>
                  <pre className="appShell_agentText">{active.agentDescription}</pre>
                </section>
              ) : null}
              <div className="appShell_body">{children}</div>
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
