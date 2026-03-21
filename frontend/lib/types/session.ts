export type Session = {
  id: string;
  title: string;
  agentDescription: string | null;
  updatedAt: string;
  status: SessionStatus;
};

export enum SessionStatus {
  COMPLETED = "COMPLETED",
  RUNNING = "RUNNING",
  DRAFT = "DRAFT",
}
