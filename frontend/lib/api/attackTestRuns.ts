import { apiFetch, downloadFileFromApi } from "@/lib/api/client";
import type { AttackTestRunDetailApi, AttackTestRunListItemApi } from "@/lib/api/types";

export async function fetchAttackTestRuns(
  sessionId: string,
): Promise<AttackTestRunListItemApi[]> {
  return apiFetch<AttackTestRunListItemApi[]>(
    `/api/v1/sessions/${sessionId}/attack-test-runs`,
  );
}

export async function fetchAttackTestRunDetail(
  sessionId: string,
  runId: string,
): Promise<AttackTestRunDetailApi> {
  return apiFetch<AttackTestRunDetailApi>(
    `/api/v1/sessions/${sessionId}/attack-test-runs/${runId}`,
  );
}

export async function downloadAttackTestRunExcel(
  sessionId: string,
  runId: string,
): Promise<void> {
  await downloadFileFromApi(
    `/api/v1/sessions/${sessionId}/attack-test-runs/${runId}/export`,
    `attack-test-run-${runId}.xlsx`,
  );
}
