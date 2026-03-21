import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import type { SessionStatus } from "@/lib/types/session";

export type SessionApi = {
  id: string;
  title: string;
  agentDescription: string | null;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  agentConnection: {
    connectionKind: AgentConnectionKind;
    settings: Record<string, unknown>;
    hasSecret: boolean;
  } | null;
};

export type LlmProviderApi = {
  id: string;
  label: string;
  model: string | null;
  hasApiKey: boolean;
  isActive: boolean;
};
