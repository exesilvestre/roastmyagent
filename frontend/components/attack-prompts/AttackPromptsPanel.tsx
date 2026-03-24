"use client";

import { useState } from "react";
import { AddPromptModal } from "./AddPromptModal";
import { AttackPromptsHeader } from "./AttackPromptsHeader";
import { AttackPromptsTable } from "./AttackPromptsTable";
import { AttackPromptsTestingBar } from "./AttackPromptsTestingBar";
import { COPY } from "./constants";
import { EditPromptModal } from "./EditPromptModal";
import { useAttackPrompts } from "./useAttackPrompts";
import "./styles.css";
import { AttackPromptsPanelProps } from "./types";



export function AttackPromptsPanel({ sessionId }: AttackPromptsPanelProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
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
  } = useAttackPrompts(sessionId);

  const removeRow = (index: number) => {
    removeRowAt(index);
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
  };

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

      <AttackPromptsHeader
        sessionId={sessionId}
        busy={busy}
        loadingList={loadingList}
        dirty={dirty}
        generating={generating}
        saving={saving}
        onGenerate={handleGenerate}
        onSave={handleSave}
      />

      <AttackPromptsTestingBar
        delaySeconds={delaySeconds}
        onDelaySeconds={setDelaySeconds}
        timeoutMode={timeoutMode}
        onTimeoutSecondsMode={selectTimeoutSecondsMode}
        onTimeoutNoneMode={selectTimeoutNoneMode}
        timeoutSecondsInput={timeoutSecondsInput}
        onTimeoutSecondsInput={handleTimeoutInputChange}
        isTimeoutValid={isTimeoutValid}
        busy={busy}
        loadingList={loadingList}
        canRunTest={canRunTest}
        dirty={dirty}
        selectedCount={selectedIds.size}
        onAddRow={() => setAddOpen(true)}
        onStartTesting={handleStartTesting}
      />

      {loadError ? <p className="attackPrompts_error">{loadError}</p> : null}
      {actionError ? <p className="attackPrompts_error">{actionError}</p> : null}
      {dirty ? (
        <p className="attackPrompts_dirty">Unsaved changes</p>
      ) : null}

      {loadingList ? (
        <p className="attackPrompts_empty">Loading…</p>
      ) : rows.length > 0 ? (
        <AttackPromptsTable
          rows={rows}
          selectedIds={selectedIds}
          busy={busy}
          loadingList={loadingList}
          allSelected={allSelected}
          selectAllRef={selectAllRef}
          onToggleSelectAll={toggleSelectAll}
          onToggleRow={toggleRowSelected}
          onEdit={setEditIndex}
          onRemove={removeRow}
        />
      ) : (
        <p className="attackPrompts_empty">{COPY.emptyNoPrompts}</p>
      )}
    </section>
  );
}


// reviewed