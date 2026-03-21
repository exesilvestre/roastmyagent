"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AttackPromptItemApi, AttackPromptsListApi } from "@/lib/api/types";
import { appToast } from "@/lib/app-toast";
import { AddPromptModal } from "./AddPromptModal";
import { EditPromptModal } from "./EditPromptModal";
import "./styles.css";

type AttackPromptsPanelProps = {
  sessionId: string;
};

export function AttackPromptsPanel({ sessionId }: AttackPromptsPanelProps) {
  const [rows, setRows] = useState<AttackPromptItemApi[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    setLoadingList(true);
    void apiFetch<AttackPromptsListApi>(`/api/v1/sessions/${sessionId}/attack-prompts`)
      .then((data) => {
        setRows(data.prompts);
        setDirty(false);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load prompts");
        setRows([]);
      })
      .finally(() => setLoadingList(false));
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePromptAt = (index: number, promptText: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, promptText } : r)),
    );
    setDirty(true);
    setActionError(null);
  };

  const handleGenerate = async () => {
    setActionError(null);
    setGenerating(true);
    try {
      const data = await apiFetch<AttackPromptsListApi>(
        `/api/v1/sessions/${sessionId}/attack-prompts/generate`,
        { method: "POST" },
      );
      setRows(data.prompts);
      setDirty(true);
      appToast.success("Generated — click Save to store in this session");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setActionError(msg);
      appToast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setActionError(null);
    setSaving(true);
    try {
      const data = await apiFetch<AttackPromptsListApi>(
        `/api/v1/sessions/${sessionId}/attack-prompts`,
        {
          method: "PUT",
          body: JSON.stringify({
            prompts: rows.map((r) => ({
              category: r.category,
              intent: r.intent,
              promptText: r.promptText,
              rationale: r.rationale,
            })),
          }),
        },
      );
      setRows(data.prompts);
      setDirty(false);
      appToast.success("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setActionError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setEditIndex((cur) => {
      if (cur === null) {
        return null;
      }
      if (cur === index) {
        return null;
      }
      if (cur > index) {
        return cur - 1;
      }
      return cur;
    });
    setDirty(true);
    setActionError(null);
  };

  const handleAddFromModal = (row: {
    category: string;
    intent: string;
    promptText: string;
    rationale: string | null;
  }) => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ...row },
    ]);
    setDirty(true);
    setActionError(null);
  };

  const busy = generating || saving;

  return (
    <section className="attackPrompts" aria-label="Adversarial prompts">
      <EditPromptModal
        open={editIndex !== null && editIndex < rows.length}
        initialPrompt={
          editIndex !== null && editIndex < rows.length
            ? rows[editIndex].promptText
            : ""
        }
        onClose={() => setEditIndex(null)}
        onSave={(prompt) => {
          if (editIndex !== null) {
            updatePromptAt(editIndex, prompt);
          }
        }}
      />
      <AddPromptModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddFromModal}
      />

      <div className="attackPrompts_header">
        <div>
          <h2 className="attackPrompts_title">Adversarial prompts</h2>
          <p className="attackPrompts_hint">
            Category, intent, and rationale are fixed per row. Remove a row and add a new one to
            change them. Only the prompt text is edited (in the modal). Generate does not save until
            you click Save.
          </p>
        </div>
        <div className="attackPrompts_toolbar">
          <button
            type="button"
            className="attackPrompts_btn attackPrompts_btnSecondary"
            disabled={busy || loadingList}
            onClick={() => setAddOpen(true)}
          >
            Add row
          </button>
          <button
            type="button"
            className="attackPrompts_btn attackPrompts_generate"
            disabled={busy || loadingList}
            onClick={() => void handleGenerate().catch(() => {})}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            className="attackPrompts_btn attackPrompts_save"
            disabled={busy || loadingList || !dirty}
            onClick={() => void handleSave().catch(() => {})}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {loadError ? <p className="attackPrompts_error">{loadError}</p> : null}
      {actionError ? <p className="attackPrompts_error">{actionError}</p> : null}
      {dirty ? (
        <p className="attackPrompts_dirty">Unsaved changes</p>
      ) : null}

      {loadingList ? (
        <p className="attackPrompts_empty">Loading…</p>
      ) : rows.length > 0 ? (
        <div className="attackPrompts_tableWrap">
          <table className="attackPrompts_table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Category</th>
                <th scope="col">Intent</th>
                <th scope="col">Prompt</th>
                <th scope="col">Rationale</th>
                <th scope="col" className="attackPrompts_colActions">
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="attackPrompts_num">{i + 1}</td>
                  <td className="attackPrompts_cellReadonly">{row.category}</td>
                  <td className="attackPrompts_cellReadonly attackPrompts_intent">
                    {row.intent}
                  </td>
                  <td className="attackPrompts_promptCell">
                    <p className="attackPrompts_promptPreview">{row.promptText}</p>
                    <button
                      type="button"
                      className="attackPrompts_editBtn"
                      onClick={() => setEditIndex(i)}
                      disabled={busy}
                    >
                      Edit prompt
                    </button>
                  </td>
                  <td className="attackPrompts_cellReadonly attackPrompts_rationale">
                    {row.rationale ?? "—"}
                  </td>
                  <td className="attackPrompts_actions">
                    <button
                      type="button"
                      className="attackPrompts_btnRow"
                      onClick={() => removeRow(i)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="attackPrompts_empty">
          No prompts yet. Generate with your active LLM provider (then Save), or use Add row.
        </p>
      )}
    </section>
  );
}
