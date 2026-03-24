import { AttackPromptItemApi } from "@/lib/api/types";
import { DELAY_OPTIONS } from "./constants";
import { RefObject } from "react";

export type AttackPromptsTestingBarProps = {
    delaySeconds: DelaySecondsOption;
    onDelaySeconds: (sec: DelaySecondsOption) => void;
    timeoutMode: "seconds" | "none";
    onTimeoutSecondsMode: () => void;
    onTimeoutNoneMode: () => void;
    timeoutSecondsInput: string;
    onTimeoutSecondsInput: (value: string) => void;
    isTimeoutValid: boolean;
    busy: boolean;
    loadingList: boolean;
    canRunTest: boolean;
    dirty: boolean;
    selectedCount: number;
    onAddRow: () => void;
    onStartTesting: () => void;
  };

  export type DelaySecondsOption = (typeof DELAY_OPTIONS)[number];


  export type EditPromptModalProps = {
    open: boolean;
    initialPrompt: string;
    onClose: () => void;
    onSave: (prompt: string) => void;
  };
  

export  type AttackPromptsTableProps = {
    rows: AttackPromptItemApi[];
    selectedIds: Set<string>;
    busy: boolean;
    loadingList: boolean;
    allSelected: boolean;
    selectAllRef: RefObject<HTMLInputElement | null>;
    onToggleSelectAll: () => void;
    onToggleRow: (id: string) => void;
    onEdit: (index: number) => void;
    onRemove: (index: number) => void;
  };

export type AttackPromptsHeaderProps = {
    sessionId: string;
    busy: boolean;
    loadingList: boolean;
    dirty: boolean;
    generating: boolean;
    saving: boolean;
    onGenerate: () => Promise<void>;
    onSave: () => Promise<void>;
  };

export type AddPromptModalProps = {
    open: boolean;
    onClose: () => void;
    onAdd: (row: {
      category: string;
      intent: string;
      promptText: string;
    }) => void;
  };


export type AttackPromptsPanelProps = {
    sessionId: string;
  };

