"use client";

import { useEffect } from "react";

type TestRunTextModalProps = {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
};

export function TestRunTextModal({ open, title, body, onClose }: TestRunTextModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="testRun_modalBackdrop" onClick={onClose} role="presentation">
      <div
        className="testRun_modalPanel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="testRun_modalTitle"
      >
        <div className="testRun_modalHeader">
          <h2 id="testRun_modalTitle" className="testRun_modalTitle">
            {title}
          </h2>
          <button type="button" className="testRun_modalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <pre className="testRun_modalBody appScroll">{body}</pre>
      </div>
    </div>
  );
}
