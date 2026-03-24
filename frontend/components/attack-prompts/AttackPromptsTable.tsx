"use client";

import type { RefObject } from "react";
import type { AttackPromptItemApi } from "@/lib/api/types";
import { AttackPromptsTableProps } from "./types";



export function AttackPromptsTable({
  rows,
  selectedIds,
  busy,
  loadingList,
  allSelected,
  selectAllRef,
  onToggleSelectAll,
  onToggleRow,
  onEdit,
  onRemove,
}: AttackPromptsTableProps) {
  return (
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
                onChange={onToggleSelectAll}
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
                  onChange={() => onToggleRow(row.id)}
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
                  onClick={() => onEdit(i)}
                  disabled={busy}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="attackPrompts_btnRow"
                  onClick={() => onRemove(i)}
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
  );
}


// reviewed