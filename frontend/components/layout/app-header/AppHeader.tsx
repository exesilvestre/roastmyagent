"use client";

import { useState } from "react";
import { ProviderConfigModal } from "@/components/layout/provider-config-modal";
import { useLlmProviderStore } from "@/lib/stores/llm-provider-store";
import type { AppHeaderProps } from "./types";
import "./styles.css";

export function AppHeader({ className = "" }: AppHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const providers = useLlmProviderStore((s) => s.providers);
  const active = providers.find((p) => p.isActive);

  return (
    <>
      <header className={`appHeader ${className}`.trim()} role="banner">
        <span className="appHeader_title">RoastMyAgent</span>
        <div className="appHeader_right">
          <span
            className="appHeader_hint"
            title={
              active
                ? `${active.label} · ${active.model ?? ""}`
                : "Choose a provider in LLM settings"
            }
          >
            {active
              ? `${active.label} · ${active.model ?? "-"}`
              : "No active LLM provider"}
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
