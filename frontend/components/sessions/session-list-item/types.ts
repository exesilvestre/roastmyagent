import type { Session } from "@/lib/types/session";

export type SessionListItemProps = {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRequestDelete: (session: Session) => void;
};
