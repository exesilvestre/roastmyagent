import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <p className="m-0 text-[var(--muted-foreground)] text-sm">
        Run configuration and results will appear here.
      </p>
    </AppShell>
  );
}
