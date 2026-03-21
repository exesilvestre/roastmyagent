"use client";

import type { ReactNode } from "react";
import { AppToastProvider } from "@/components/feedback/app-toast/AppToastProvider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <AppToastProvider>{children}</AppToastProvider>;
}
