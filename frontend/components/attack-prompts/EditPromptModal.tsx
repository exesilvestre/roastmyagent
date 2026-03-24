"use client";

import { useEffect, useState } from "react";
import { EditPromptModalProps } from "./types";


export function EditPromptModal({
  open,
  initialPrompt,
  onClose,
  onSave,
}: EditPromptModalProps) {
  const [draft, setDraft] = useState(initialPrompt);

  useEffect(() => {
    if (open) {
      setDraft(initialPrompt);
    }
  }, [open, initialPrompt]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="attackPromptModal_overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="attackPromptModal attackPromptModal_edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attackPromptModal_editTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="attackPromptModal_editTitle" className="attackPromptModal_title">
          Edit prompt
        </h2>
        <p className="attackPromptModal_sub">
          Only the prompt text is editable. To change category or intent, remove this row and add a
          new one.
        </p>
        <textarea
          className="attackPromptModal_textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={14}
          spellCheck={false}
        />
        <div className="attackPromptModal_actions">
          <button type="button" className="attackPromptModal_cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="attackPromptModal_primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
