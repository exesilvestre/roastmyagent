"use client";

import { useEffect } from "react";

export type TestRunModalSection = { title: string; body: string };

type TestRunTextModalProps = {
  open: boolean;
  onClose: () => void;
  /** Header for the dialog */
  title: string;
  /** Single block (e.g. agent response) when `sections` is absent */
  body: string;
  /** Multiple titled blocks (e.g. judge validation brief + reasoning) */
  sections?: TestRunModalSection[];
};

export function TestRunTextModal({ open, onClose, title, body, sections }: TestRunTextModalProps) {
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

  const useSections = sections && sections.length > 0;

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
        {useSections ? (
          <div className="testRun_modalSections appScroll">
            {sections!.map((s) => (
              <section key={s.title} className="testRun_modalSection">
                <h3 className="testRun_modalSectionTitle">{s.title}</h3>
                <pre className="testRun_modalSectionBody">{s.body}</pre>
              </section>
            ))}
          </div>
        ) : (
          <pre className="testRun_modalBody appScroll">{body}</pre>
        )}
      </div>
    </div>
  );
}
