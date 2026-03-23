import type { AgentConnectionPublic } from "@/lib/types/agent-connection";

export type Session = {
  id: string;
  title: string;
  agentDescription: string | null;
  updatedAt: string;
  agentConnection: AgentConnectionPublic | null;
};
