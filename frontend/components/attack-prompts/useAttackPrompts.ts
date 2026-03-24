"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AttackPromptItemApi, AttackPromptsListApi } from "@/lib/api/types";
import { appToast } from "@/lib/app-toast";
import {
  persistTestRunLaunchToSessionStorage,
  useTestRunLaunchStore,
} from "@/lib/stores/test-run-launch-store";
import {
  COPY,
  TIMEOUT_MAX_SECONDS,
  TIMEOUT_MIN_SECONDS,
} from "./constants";
import { DelaySecondsOption } from "./types";


export function useAttackPrompts(sessionId: string) {
  const router = useRouter();
  const setTestRunPending = useTestRunLaunchStore((s) => s.setPending);
  const [rows, setRows] = useState<AttackPromptItemApi[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [delaySeconds, setDelaySeconds] = useState<DelaySecondsOption>(10);
  const [timeoutMode, setTimeoutMode] = useState<"seconds" | "none">("seconds");
  const [timeoutSecondsInput, setTimeoutSecondsInput] = useState("20");
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  const toggleSelectAll = useCallback(() => {
    if (rows.length === 0) {
      return;
    }
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }, [allSelected, rows]);

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const updatePromptAt = useCallback((index: number, promptText: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, promptText } : r)),
    );
    setDirty(true);
    setActionError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    setActionError(null);
    setGenerating(true);
    try {
      const data = await apiFetch<AttackPromptsListApi>(
        `/api/v1/sessions/${sessionId}/attack-prompts/generate`,
        { method: "POST" },
      );
      setRows(data.prompts);
      setDirty(true);
      appToast.success("Generated, click Save to store in this session");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setActionError(msg);
      appToast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  const handleSave = useCallback(async () => {
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
  }, [rows, sessionId]);

  const removeRowAt = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
    setActionError(null);
  }, []);

  const handleStartTesting = useCallback(() => {
    if (dirty) {
      appToast.error(COPY.toastSaveBeforeRun);
      return;
    }
    const chosen = rows.filter((r) => selectedIds.has(r.id));
    if (chosen.length === 0) {
      appToast.error(COPY.toastSelectPrompt);
      return;
    }
    const parsedTimeout = Number.parseInt(timeoutSecondsInput, 10);
    const timeoutSeconds =
      timeoutMode === "none"
        ? null
        : Number.isFinite(parsedTimeout) &&
            parsedTimeout >= TIMEOUT_MIN_SECONDS &&
            parsedTimeout <= TIMEOUT_MAX_SECONDS
          ? parsedTimeout
          : null;
    if (timeoutMode === "seconds" && timeoutSeconds === null) {
      appToast.error(COPY.toastAgentTimeoutRange);
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
  }, [
    delaySeconds,
    dirty,
    rows,
    router,
    selectedIds,
    sessionId,
    setTestRunPending,
    timeoutMode,
    timeoutSecondsInput,
  ]);

  const handleAddFromModal = useCallback(
    (row: { category: string; intent: string; promptText: string }) => {
      setRows((prev) => [...prev, { id: crypto.randomUUID(), ...row }]);
      setDirty(true);
      setActionError(null);
    },
    [],
  );

  const handleTimeoutInputChange = useCallback((value: string) => {
    const trimmed = value.trim();
    setTimeoutSecondsInput(value);
    if (trimmed === "0") {
      setTimeoutMode("none");
    } else if (timeoutMode === "none") {
      setTimeoutMode("seconds");
    }
  }, [timeoutMode]);

  const selectTimeoutSecondsMode = useCallback(() => {
    setTimeoutMode("seconds");
    setTimeoutSecondsInput((prev) => (prev.trim() === "0" ? "20" : prev));
  }, []);

  const selectTimeoutNoneMode = useCallback(() => {
    setTimeoutMode("none");
  }, []);

  const busy = generating || saving;
  const parsedTimeoutForUi = Number.parseInt(timeoutSecondsInput, 10);
  const isTimeoutValid =
    timeoutMode === "none" ||
    (Number.isFinite(parsedTimeoutForUi) &&
      parsedTimeoutForUi >= TIMEOUT_MIN_SECONDS &&
      parsedTimeoutForUi <= TIMEOUT_MAX_SECONDS);
  const canRunTest =
    !loadingList &&
    rows.length > 0 &&
    !dirty &&
    selectedIds.size > 0 &&
    isTimeoutValid &&
    !generating &&
    !saving;

  return {
    rows,
    selectedIds,
    delaySeconds,
    setDelaySeconds,
    timeoutMode,
    timeoutSecondsInput,
    loadingList,
    generating,
    saving,
    dirty,
    loadError,
    actionError,
    selectAllRef,
    allSelected,
    toggleSelectAll,
    toggleRowSelected,
    busy,
    isTimeoutValid,
    canRunTest,
    handleGenerate,
    handleSave,
    removeRowAt,
    handleStartTesting,
    handleAddFromModal,
    handleTimeoutInputChange,
    selectTimeoutSecondsMode,
    selectTimeoutNoneMode,
    updatePromptAt,
  };
}


export type { DelaySecondsOption };

// reviewed