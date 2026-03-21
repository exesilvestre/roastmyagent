"use client";

import { AttackPromptsPanel } from "@/components/attack-prompts/AttackPromptsPanel";
import { AppShell } from "@/components/layout/app-shell";
import { useSessionStore } from "@/lib/stores/session-store";

export default function Home() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  return (
    <AppShell>
      {activeSessionId ? (
        <AttackPromptsPanel sessionId={activeSessionId} />
      ) : (
        <p className="m-0 text-[var(--muted-foreground)] text-sm">
          Run configuration and results will appear here.
        </p>
      )}
    </AppShell>
  );
}
