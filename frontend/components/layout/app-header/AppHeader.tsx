"use client";

import { Provider, useState } from "react";
import { ProviderConfigModal } from "@/components/layout/provider-config-modal";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import type { AppHeaderProps, ApiLlmProvider } from "./types";
import "./styles.css";

function getProviderDisplay(active?: ApiLlmProvider) {
  if (!active) {
    return {
      label: "No active LLM provider",
      tooltip: "Choose a provider in LLM settings",
    };
  }

  return {
    label: `${active.label} · ${active.model ?? "-"}`,
    tooltip: `${active.label} · ${active.model ?? ""}`,
  };
}

export function AppHeader({ className = "" }: AppHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const active = useLlmProviderStore((s) =>
    s.providers.find((p) => p.isActive)
  );

  const { label, tooltip } = getProviderDisplay(active as ApiLlmProvider);


  return (
    <>
      <header className={`appHeader ${className}`.trim()} role="banner">
        <span className="appHeader_title">RoastMyAgent</span>
        <div className="appHeader_right">
        <span
          className="appHeader_hint"
          title={tooltip}
        >
          {label}
        </span>
          <button
            type="button"
            className="appHeader_button"
            onClick={() => setIsModalOpen(true)}
          >
            LLM settings
          </button>
        </div>
      </header>
      <ProviderConfigModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}


// reviewed
