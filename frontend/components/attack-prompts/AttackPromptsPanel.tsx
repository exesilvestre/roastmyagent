"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AttackPromptItemApi, AttackPromptsListApi } from "@/lib/api/types";
import { appToast } from "@/lib/app-toast";
import {
  persistTestRunLaunchToSessionStorage,
  useTestRunLaunchStore,
} from "@/lib/stores/test-run-launch-store";
import { AddPromptModal } from "./AddPromptModal";
import { EditPromptModal } from "./EditPromptModal";
import "./styles.css";

type AttackPromptsPanelProps = {
  sessionId: string;
};

const DELAY_OPTIONS = [5, 10, 20] as const;

export function AttackPromptsPanel({ sessionId }: AttackPromptsPanelProps) {
  const router = useRouter();
  const setTestRunPending = useTestRunLaunchStore((s) => s.setPending);
  const [rows, setRows] = useState<AttackPromptItemApi[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [delaySeconds, setDelaySeconds] = useState<(typeof DELAY_OPTIONS)[number]>(10);
  const [timeoutMode, setTimeoutMode] = useState<"seconds" | "none">("seconds");
  const [timeoutSecondsInput, setTimeoutSecondsInput] = useState("20");
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const rowIdsKeyRef = useRef<string>("");
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    rowIdsKeyRef.current = "";
    setSelectedIds(new Set());
  }, [sessionId]);

  const rowIdsKey = rows.map((r) => r.id).join("\0");

  useEffect(() => {
    if (rowIdsKeyRef.current === rowIdsKey) {
      return;
    }
    const wasEmpty = rowIdsKeyRef.current === "";
    const oldIdList = rowIdsKeyRef.current ? rowIdsKeyRef.current.split("\0") : [];
    const oldIds = new Set(oldIdList);
    rowIdsKeyRef.current = rowIdsKey;

    setSelectedIds((prev) => {
      const ids = rows.map((r) => r.id);
      if (wasEmpty) {
        return new Set(ids);
      }
      const next = new Set<string>();
      for (const id of ids) {
        if (oldIds.has(id)) {
          if (prev.has(id)) {
            next.add(id);
          }
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, [rows, rowIdsKey]);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) {
      el.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    if (rows.length === 0) {
      return;
    }
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const handleStartTesting = () => {
    if (dirty) {
      appToast.error("Save your prompts before running the test.");
      return;
    }
    const chosen = rows.filter((r) => selectedIds.has(r.id));
    if (chosen.length === 0) {
      appToast.error("Select at least one prompt.");
      return;
    }
    const parsedTimeout = Number.parseInt(timeoutSecondsInput, 10);
    const timeoutSeconds =
      timeoutMode === "none"
        ? null
        : Number.isFinite(parsedTimeout) && parsedTimeout >= 1 && parsedTimeout <= 600
          ? parsedTimeout
          : null;
    if (timeoutMode === "seconds" && timeoutSeconds === null) {
      appToast.error("Agent timeout must be a number between 1 and 600 seconds.");
      return;
    }
    setActionError(null);
    const payload = {
      sessionId,
      promptIds: chosen.map((r) => r.id),
      delaySeconds,
      agentTimeoutSeconds: timeoutSeconds,
      plannedPrompts: chosen.map((r) => ({
        id: r.id,
        category: r.category,
        intent: r.intent,
        promptText: r.promptText,
      })),
    };
    setTestRunPending(payload);
    persistTestRunLaunchToSessionStorage(payload);
    router.push(`/sessions/${sessionId}/run`);
  };

  const handleAddFromModal = (row: {
    category: string;
    intent: string;
    promptText: string;
  }) => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ...row },
    ]);
    setDirty(true);
    setActionError(null);
  };

  const handleTimeoutInputChange = (value: string) => {
    const trimmed = value.trim();
    setTimeoutSecondsInput(value);
    if (trimmed === "0") {
      setTimeoutMode("none");
    } else if (timeoutMode === "none") {
      setTimeoutMode("seconds");
    }
  };

  const busy = generating || saving;
  const parsedTimeoutForUi = Number.parseInt(timeoutSecondsInput, 10);
  const isTimeoutValid =
    timeoutMode === "none" ||
    (Number.isFinite(parsedTimeoutForUi) &&
      parsedTimeoutForUi >= 1 &&
      parsedTimeoutForUi <= 600);
  const canRunTest =
    !loadingList &&
    rows.length > 0 &&
    !dirty &&
    selectedIds.size > 0 &&
    isTimeoutValid &&
    !generating &&
    !saving;

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
           Save before running a test. Start testing opens a live view: each prompt is sent to
            your HTTP agent (POST body), then an LLM judge scores the reply. Delay applies between
            requests.
          </p>
        </div>
        <div className="attackPrompts_toolbar">
          <div className="attackPrompts_toolbarPrimary">
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
          <Link
            href={`/sessions/${sessionId}/tests`}
            className="attackPrompts_historyTextLink"
          >
            See test history &gt;
          </Link>
        </div>
      </div>

      <div className="attackPrompts_testingBar" aria-label="Run attack test">
        <div className="attackPrompts_testingBar_fields">
          <span className="attackPrompts_testingLabel" id="attack-delay-label">
            Delay between requests
          </span>
          <div
            className="attackPrompts_segmented"
            role="group"
            aria-labelledby="attack-delay-label"
          >
            {DELAY_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                className={
                  delaySeconds === sec
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={delaySeconds === sec}
                disabled={busy || loadingList}
                onClick={() => setDelaySeconds(sec)}
              >
                {sec}s
              </button>
            ))}
          </div>
          <div className="attackPrompts_timeoutControls">
            <span className="attackPrompts_testingLabel" id="attack-timeout-label">
              Agent request timeout
            </span>
            <div
              className="attackPrompts_segmented"
              role="group"
              aria-labelledby="attack-timeout-label"
            >
              <button
                type="button"
                className={
                  timeoutMode === "seconds"
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={timeoutMode === "seconds"}
                disabled={busy || loadingList}
                onClick={() => {
                  setTimeoutMode("seconds");
                  if (timeoutSecondsInput.trim() === "0") {
                    setTimeoutSecondsInput("20");
                  }
                }}
              >
                Timeout
              </button>
              <button
                type="button"
                className={
                  timeoutMode === "none"
                    ? "attackPrompts_segmentedBtn attackPrompts_segmentedBtnActive"
                    : "attackPrompts_segmentedBtn"
                }
                aria-pressed={timeoutMode === "none"}
                disabled={busy || loadingList}
                onClick={() => setTimeoutMode("none")}
              >
                No timeout
              </button>
            </div>
            <label className="attackPrompts_timeoutField" htmlFor="attack-timeout-seconds">
              <span className="attackPrompts_timeoutSuffix">seconds</span>
              <input
                id="attack-timeout-seconds"
                type="number"
                min={0}
                max={600}
                step={1}
                inputMode="numeric"
                className="attackPrompts_timeoutInput"
                value={timeoutSecondsInput}
                disabled={busy || loadingList}
                aria-invalid={!isTimeoutValid}
                onChange={(e) => handleTimeoutInputChange(e.target.value)}
              />
            </label>
          </div>
          {!isTimeoutValid ? (
            <span className="attackPrompts_timeoutError">Use a value between 1 and 600.</span>
          ) : null}
        </div>
        
      </div>
      <div className="attackPrompts_testingBar_right">
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
            className="attackPrompts_btn attackPrompts_startTest"
            disabled={!canRunTest}
            title={
              dirty
                ? "Save prompts before running the test"
                : selectedIds.size === 0
                  ? "Select at least one prompt"
                  : undefined
            }
            onClick={() => handleStartTesting()}
          >
            Start testing
          </button>
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
                <th scope="col" className="attackPrompts_colCheck">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="attackPrompts_check"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={busy || loadingList || rows.length === 0}
                    aria-label="Select all prompts for testing"
                  />
                </th>
                <th scope="col">#</th>
                <th scope="col">Category</th>
                <th scope="col">Intent</th>
                <th scope="col">Prompt</th>
                <th scope="col" className="attackPrompts_colActions">
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="attackPrompts_checkCell">
                    <input
                      type="checkbox"
                      className="attackPrompts_check"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRowSelected(row.id)}
                      disabled={busy || loadingList}
                      aria-label={`Include prompt ${i + 1} in test`}
                    />
                  </td>
                  <td className="attackPrompts_num">{i + 1}</td>
                  <td className="attackPrompts_cellReadonly">{row.category}</td>
                  <td className="attackPrompts_cellReadonly attackPrompts_intent">
                    {row.intent}
                  </td>
                  <td className="attackPrompts_promptCell">
                    <div className="attackPrompts_promptBlock">
                      <div className="attackPrompts_promptPreview">{row.promptText}</div>
                      
                    </div>
                  </td>
                  <td className="attackPrompts_actions">
                      <button
                        type="button"
                        className="attackPrompts_editBtn"
                        onClick={() => setEditIndex(i)}
                        disabled={busy}
                      >
                        Edit
                      </button>
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
