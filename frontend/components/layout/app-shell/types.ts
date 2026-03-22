import type { ReactNode } from "react";

export type AppShellSidebarMode = "sessions" | "sessionTests";

export type AppShellProps = {
  children?: ReactNode;
  /** Left column: global session list (default) or saved test runs for one session. */
  sidebarMode?: AppShellSidebarMode;
  /** When `sidebarMode` is `sessionTests`, which session’s runs to list. */
  sessionTestSidebarId?: string;
  /** Omit session title, subtitle, and About this agent (test run / test history views). */
  testSessionChrome?: boolean;
};
