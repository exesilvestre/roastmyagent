"use client";

import { useParams } from "next/navigation";
import { SessionAttackTestStreamHost } from "@/components/test-run/SessionAttackTestStreamHost";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return (
    <>
      <SessionAttackTestStreamHost sessionId={sessionId} />
      {children}
    </>
  );
}
