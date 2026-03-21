"use client";

import { useEffect, useState } from "react";

type AddPromptModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (row: {
    category: string;
    intent: string;
    promptText: string;
    rationale: string | null;
  }) => void;
};

const empty = {
  category: "",
  intent: "",
  promptText: "",
  rationale: "",
};

export function AddPromptModal({ open, onClose, onAdd }: AddPromptModalProps) {
  const [fields, setFields] = useState(empty);

  useEffect(() => {
    if (open) {
      setFields(empty);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canSubmit =
    fields.category.trim() !== "" &&
    fields.intent.trim() !== "" &&
    fields.promptText.trim() !== "";

  const submit = () => {
    const category = fields.category.trim();
    const intent = fields.intent.trim();
    const promptText = fields.promptText.trim();
    const rationaleRaw = fields.rationale.trim();
    if (!category || !intent || !promptText) {
      return;
    }
    onAdd({
      category,
      intent,
      promptText,
      rationale: rationaleRaw ? rationaleRaw : null,
    });
    onClose();
  };

  return (
    <div
      className="attackPromptModal_overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="attackPromptModal attackPromptModal_add"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attackPromptModal_addTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="attackPromptModal_addTitle" className="attackPromptModal_title">
          Add prompt
        </h2>
        <p className="attackPromptModal_sub">
          Set category, intent, and rationale here. Afterwards only the prompt text can be edited
          (via Edit prompt).
        </p>
        <label className="attackPromptModal_label">
          Category
          <input
            className="attackPromptModal_input"
            value={fields.category}
            onChange={(e) => setFields((f) => ({ ...f, category: e.target.value }))}
            autoComplete="off"
          />
        </label>
        <label className="attackPromptModal_label">
          Intent
          <input
            className="attackPromptModal_input"
            value={fields.intent}
            onChange={(e) => setFields((f) => ({ ...f, intent: e.target.value }))}
            autoComplete="off"
          />
        </label>
        <label className="attackPromptModal_label">
          Rationale (optional)
          <textarea
            className="attackPromptModal_textarea attackPromptModal_textareaShort"
            value={fields.rationale}
            onChange={(e) => setFields((f) => ({ ...f, rationale: e.target.value }))}
            rows={3}
          />
        </label>
        <label className="attackPromptModal_label">
          Prompt
          <textarea
            className="attackPromptModal_textarea"
            value={fields.promptText}
            onChange={(e) => setFields((f) => ({ ...f, promptText: e.target.value }))}
            rows={8}
            spellCheck={false}
          />
        </label>
        <div className="attackPromptModal_actions">
          <button type="button" className="attackPromptModal_cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="attackPromptModal_primary"
            onClick={submit}
            disabled={!canSubmit}
          >
            Add to list
          </button>
        </div>
      </div>
    </div>
  );
}
