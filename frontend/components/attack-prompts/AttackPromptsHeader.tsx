"use client";

import Link from "next/link";
import { COPY } from "./constants";
import { AttackPromptsHeaderProps } from "./types";


export function AttackPromptsHeader({
  sessionId,
  busy,
  loadingList,
  dirty,
  generating,
  saving,
  onGenerate,
  onSave,
}: AttackPromptsHeaderProps) {
  return (
    <div className="attackPrompts_header">
      <div>
        <h2 className="attackPrompts_title">Adversarial prompts</h2>
        <p className="attackPrompts_hint">{COPY.headerHint}</p>
      </div>
      <div className="attackPrompts_toolbar">
        <div className="attackPrompts_toolbarPrimary">
          <button
            type="button"
            className="attackPrompts_btn attackPrompts_generate"
            disabled={busy || loadingList}
            onClick={() => void onGenerate()}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            className="attackPrompts_btn attackPrompts_save"
            disabled={busy || loadingList || !dirty}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <Link
          href={`/sessions/${sessionId}/tests`}
          className="attackPrompts_historyTextLink"
        >
          See test history &gt;
        </Link>
      </div>
    </div>
  );
}

// reviewed
