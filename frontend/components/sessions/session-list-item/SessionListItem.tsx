"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { SessionListItemProps } from "./types";
import "./styles.css";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function SessionListItem({
  session,
  isActive,
  onSelect,
  onRequestDelete,
}: SessionListItemProps) {
  return (
    <div
      className={`sessionListItem ${isActive ? "sessionListItem_active" : ""}`}
    >
      <button
        type="button"
        className="sessionListItem_main"
        onClick={() => onSelect(session.id)}
      >
        <span className="sessionListItem_title">{session.title}</span>
        <span className="sessionListItem_meta">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </button>
      <button
        type="button"
        className="sessionListItem_delete"
        title="Delete session"
        aria-label={`Delete session ${session.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestDelete(session);
        }}
      >
        <span className="sessionListItem_deleteIconWrap" aria-hidden>
          <DeleteOutlineIcon className="sessionListItem_deleteIcon" fontSize="inherit" />
        </span>
      </button>
    </div>
  );
}
