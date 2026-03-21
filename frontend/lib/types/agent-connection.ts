export type AgentConnectionKind = "MCP" | "HTTP_LOCAL" | "HTTP_REMOTE_BASIC";

export type AgentConnectionPublic = {
  connectionKind: AgentConnectionKind;
  settings: Record<string, unknown>;
  hasSecret: boolean;
};
