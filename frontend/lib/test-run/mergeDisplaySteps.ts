import type { PlannedPromptMeta } from "@/lib/stores/test-run-launch-store";
import type { RunStepRow } from "@/lib/test-run/types";

export function mergeDisplaySteps(params: {
  rowCount: number;
  plannedPrompts?: PlannedPromptMeta[];
  promptIds?: string[];
  byIndex: Record<number, RunStepRow>;
  /** From GET attack-prompts when planned text is missing (e.g. history replay). */
  promptTextById?: Record<string, string>;
}): RunStepRow[] {
  const { rowCount, plannedPrompts, promptIds, byIndex, promptTextById } = params;
  const steps: RunStepRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const live = byIndex[i];
    const planned = plannedPrompts?.[i];
    const fallbackId = promptIds?.[i];
    const pid = live?.promptId ?? planned?.id ?? fallbackId;
    const fromLookup = pid && promptTextById ? promptTextById[pid] : undefined;
    const promptText = planned?.promptText ?? live?.promptText ?? fromLookup;
    steps.push({
      index: i,
      promptId: pid,
      promptText,
      category: live?.category ?? planned?.category,
      intent: live?.intent ?? planned?.intent,
      agent: live?.agent,
      judgePending: live?.judgePending,
      judge: live?.judge,
    });
  }
  return steps;
}

export function displayRowCount(params: {
  totalSteps: number;
  plannedPrompts?: PlannedPromptMeta[];
  promptIds?: string[];
}): number {
  const { totalSteps, plannedPrompts, promptIds } = params;
  if (totalSteps > 0) {
    return totalSteps;
  }
  if (plannedPrompts?.length) {
    return plannedPrompts.length;
  }
  return promptIds?.length ?? 0;
}
