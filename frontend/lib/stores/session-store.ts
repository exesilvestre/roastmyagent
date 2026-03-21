import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { SessionApi } from "@/lib/api/types";
import { Session, SessionStatus } from "@/lib/types/session";

function mapSession(row: SessionApi): Session {
  return {
    id: row.id,
    title: row.title,
    agentDescription: row.agentDescription ?? null,
    status: row.status as SessionStatus,
    updatedAt: row.updatedAt,
  };
}

export type CreateSessionInput = {
  title: string;
  agentDescription?: string;
};

type SessionStore = {
  sessions: Session[];
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  error: null,
  setActiveSession: (id) => set({ activeSessionId: id }),
  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const rows = await apiFetch<SessionApi[]>("/api/v1/sessions");
      const sessions = rows.map(mapSession);
      set({ sessions, loading: false });
      const current = get().activeSessionId;
      const stillValid = current && sessions.some((s) => s.id === current);
      if (!stillValid && sessions.length > 0) {
        set({ activeSessionId: sessions[0].id });
      }
      if (sessions.length === 0) {
        set({ activeSessionId: null });
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load sessions",
        loading: false,
      });
    }
  },
  createSession: async (input: CreateSessionInput) => {
    set({ error: null });
    try {
      const payload: Record<string, string> = { title: input.title.trim() };
      const desc = input.agentDescription?.trim();
      if (desc) {
        payload.agentDescription = desc;
      }
      const row = await apiFetch<SessionApi>("/api/v1/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const session = mapSession(row);
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to create session",
      });
      throw e;
    }
  },
  deleteSession: async (id: string) => {
    try {
      await apiFetch<void>(`/api/v1/sessions/${id}`, { method: "DELETE" });
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id);
        let activeSessionId = state.activeSessionId;
        if (activeSessionId === id) {
          activeSessionId = sessions[0]?.id ?? null;
        }
        return { sessions, activeSessionId };
      });
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Failed to delete session");
    }
  },
}));
