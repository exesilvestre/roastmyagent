"use client";

import { useState } from "react";
import { useSessionStore } from "@/lib/stores/session-store";
import { SessionListItem } from "@/components/sessions/session-list-item";
import { NewSessionModal } from "@/components/sessions/new-session-modal/NewSessionModal";
import { ConfirmModal } from "@/components/feedback/confirm-modal/ConfirmModal";
import { appToast } from "@/lib/app-toast";
import type { Session } from "@/lib/types/session";
import type { SessionSidebarProps } from "./types";
import "./styles.css";

export function SessionSidebar({ className = "" }: SessionSidebarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleRequestDelete = (session: Session) => {
    setPendingDelete(session);
  };

  const handleCloseDeleteModal = () => {
    if (!deleteBusy) {
      setPendingDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteSession(pendingDelete.id);
      appToast.success("Session deleted");
      setPendingDelete(null);
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "Failed to delete session");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <aside className={`sessionSidebar ${className}`.trim()}>
      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete session"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        busy={deleteBusy}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
      <NewSessionModal open={newSessionOpen} onClose={() => setNewSessionOpen(false)} />
      <button
        type="button"
        className="sessionSidebar_new"
        onClick={() => setNewSessionOpen(true)}
        title="New test session"
      >
        New session
      </button>
      <div className="sessionSidebar_label">Recent</div>
      {error ? (
        <p className="sessionSidebar_error" role="alert">
          {error}
        </p>
      ) : null}
      <nav className="sessionSidebar_list" aria-label="Test sessions">
        {loading && sessions.length === 0 ? (
          <p className="sessionSidebar_muted">Loading…</p>
        ) : null}
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={setActiveSession}
            onRequestDelete={handleRequestDelete}
          />
        ))}
      </nav>
    </aside>
  );
}
