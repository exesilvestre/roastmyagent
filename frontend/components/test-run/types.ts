import type { RunStepRow } from "@/lib/test-run/types";

export type TestRunTimelinePhase = "running" | "done" | "error" | "no_launch";

export type TestRunTimelineVariant = "page" | "embedded";

export type TestRunModalSection = { title: string; body: string };

export type TestRunTimelineProps = {
  sessionTitle: string | null;
  sessionId: string;
  runId?: string | null;
  totalSteps: number;
  summary: { ok: number; fail: number } | null;
  displaySteps: RunStepRow[];
  liveByIndex: Record<number, RunStepRow | undefined>;
  fatalError: string | null;
  phase: TestRunTimelinePhase;
  showProgressRing?: boolean;
  /** Slimmer layout for history detail column. */
  variant?: TestRunTimelineVariant;
};

export type TestRunStepCanvasProps = {
  sessionId: string;
  runId: string | null;
  step: RunStepRow | undefined;
  live: RunStepRow | undefined;
};

export type TextModalState = {
  title: string;
  body: string;
  sections?: TestRunModalSection[];
} | null;

export type TestRunStepStripProps = {
  displaySteps: RunStepRow[];
  liveByIndex: Record<number, RunStepRow | undefined>;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
};

export type TestRunPanelProps = {
  sessionId: string;
  sessionTitle: string | null;
};

export type TestRunsHistoryProps = {
  sessionId: string;
  sessionTitle: string | null;
};

export type TestRunDetailMeta = {
  createdAt: string;
  delaySeconds: number;
};

export type TestRunTextModalProps = {
  open: boolean;
  onClose: () => void;
  /** Header for the dialog */
  title: string;
  /** Single block (e.g. agent response) when `sections` is absent */
  body: string;
  /** Multiple titled blocks (e.g. judge validation brief + reasoning) */
  sections?: TestRunModalSection[];
};

export type SessionTestRunsSidebarProps = {
  sessionId: string;
};

export type SessionAttackTestStreamHostProps = {
  sessionId: string;
};
