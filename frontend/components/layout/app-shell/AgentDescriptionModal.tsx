"use client";

import { useEffect, useState } from "react";
import { appToast } from "@/lib/app-toast";
import { useSessionStore } from "@/lib/stores/session-store";

const MAX_LEN = 16000;

type AgentDescriptionModalProps = {
  open: boolean;
  sessionId: string;
  initialDescription: string;
  onClose: () => void;
};

export function AgentDescriptionModal({
  open,
  sessionId,
  initialDescription,
  onClose,
}: AgentDescriptionModalProps) {
  const updateSession = useSessionStore((s) => s.updateSession);
  const [draft, setDraft] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initialDescription);
    }
  }, [open, initialDescription]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed.length > MAX_LEN) {
      appToast.error(`Description must be at most ${MAX_LEN} characters.`);
      return;
    }
    setSaving(true);
    try {
      await updateSession(sessionId, {
        agentDescription: trimmed.length > 0 ? trimmed : null,
      });
      appToast.success("Agent description saved.");
      onClose();
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="appShell_agentModalBackdrop" onClick={onClose} role="presentation">
      <div
        className="appShell_agentModalPanel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appShell_agentModalTitle"
      >
        <div className="appShell_agentModalHeader">
          <h2 id="appShell_agentModalTitle" className="appShell_agentModalTitle">
            About this agent
          </h2>
          <button
            type="button"
            className="appShell_agentModalClose"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="appShell_agentModalBody">
          <textarea
            className="appShell_agentModalTextarea appScroll"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_LEN}
            rows={14}
            spellCheck
            placeholder="What does this agent do? System Prompt,Constraints, tools, tone…"
            aria-label="Agent description"
          />
          <p className="appShell_agentModalHint">
            {draft.length} / {MAX_LEN}
          </p>
        </div>
        <div className="appShell_agentModalFooter">
          <button
            type="button"
            className="appShell_agentModalBtn appShell_agentModalBtnGhost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="appShell_agentModalBtn appShell_agentModalBtnPrimary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
