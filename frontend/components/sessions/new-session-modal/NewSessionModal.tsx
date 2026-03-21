"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/stores/session-store";
import { appToast } from "@/lib/app-toast";
import type { NewSessionModalProps } from "./types";
import "./styles.css";

export function NewSessionModal({ open, onClose }: NewSessionModalProps) {
  const createSession = useSessionStore((s) => s.createSession);

  const [title, setTitle] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle("");
    setAgentDescription("");
    setLocalError(null);
    setSubmitting(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError("Agent name is required.");
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    try {
      await createSession({
        title: trimmed,
        agentDescription: agentDescription.trim() || undefined,
      });
      appToast.success("Session created");
      onClose();
    } catch (e) {
      setSubmitting(false);
      setLocalError(e instanceof Error ? e.message : "Failed to create session");
    }
  };

  return (
    <div className="newSessionModal_overlay" role="presentation" onClick={onClose}>
      <section
        className="newSessionModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newSessionModal_heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="newSessionModal_header">
          <h2 id="newSessionModal_heading" className="newSessionModal_title">
            New test session
          </h2>
        </div>
        <p className="newSessionModal_hint">
          Name the agent you are testing and optionally describe what it does, its boundaries, and
          which tools or APIs it can call. This context will be used to tailor adversarial prompts.
        </p>
        <form className="newSessionModal_form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="newSessionModal_label">
            Agent name
            <input
              className="newSessionModal_input"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              autoComplete="off"
              placeholder="e.g. Support triage bot"
              required
            />
          </label>
          <label className="newSessionModal_label">
            Agent details (optional)
            <textarea
              className="newSessionModal_textarea"
              value={agentDescription}
              onChange={(ev) => setAgentDescription(ev.target.value)}
              placeholder="What it is allowed to do, data it sees, tools (search, code exec, …)"
            />
          </label>
          {localError ? (
            <p className="newSessionModal_error" role="alert">
              {localError}
            </p>
          ) : null}
          <div className="newSessionModal_actions">
            <button type="button" className="newSessionModal_cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="newSessionModal_submit"
              disabled={submitting || !title.trim()}
            >
              {submitting ? "Creating…" : "Create session"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
