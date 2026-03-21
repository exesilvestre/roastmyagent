"use client";

import type { ConfirmModalProps } from "./types";
import "./styles.css";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  const handleOverlayClick = () => {
    if (!busy) {
      onClose();
    }
  };

  const handleConfirm = () => {
    void onConfirm();
  };

  const confirmClass =
    variant === "danger"
      ? "confirmModal_confirm confirmModal_confirmDanger"
      : "confirmModal_confirm";

  return (
    <div className="confirmModal_overlay" role="presentation" onClick={handleOverlayClick}>
      <section
        className="confirmModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmModal_heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirmModal_header">
          <h2 id="confirmModal_heading" className="confirmModal_title">
            {title}
          </h2>
        </div>
        <p className="confirmModal_message">{message}</p>
        <div className="confirmModal_actions">
          <button
            type="button"
            className="confirmModal_cancel"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={handleConfirm} disabled={busy}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
