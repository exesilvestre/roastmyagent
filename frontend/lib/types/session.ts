import type { AgentConnectionPublic } from "@/lib/types/agent-connection";

export type Session = {
  id: string;
  title: string;
  agentDescription: string | null;
  updatedAt: string;
  status: SessionStatus;
  agentConnection: AgentConnectionPublic | null;
};

export enum SessionStatus {
  COMPLETED = "COMPLETED",
  RUNNING = "RUNNING",
  DRAFT = "DRAFT",
}
