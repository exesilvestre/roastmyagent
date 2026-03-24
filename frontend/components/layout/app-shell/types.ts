import type { ReactNode } from "react";

export type AppShellSidebarMode = "sessions" | "sessionTests";

export type AppShellProps = {
  children?: ReactNode;
  sidebarMode?: AppShellSidebarMode;
  sessionTestSidebarId?: string;
  testSessionChrome?: boolean;
};


export type AgentDescriptionModalProps = {
  open: boolean;
  sessionId: string;
  initialDescription: string;
  onClose: () => void;
};