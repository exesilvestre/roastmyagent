import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { LlmProviderApi } from "@/lib/api/types";
import type { LlmProviderId } from "@/lib/types/llm-provider";

type LlmProviderStore = {
  providers: LlmProviderApi[];
  loading: boolean;
  error: string | null;
  fetchProviders: () => Promise<void>;
  patchProvider: (
    id: LlmProviderId,
    body: { apiKey?: string; model?: string },
  ) => Promise<void>;
  activateProvider: (id: LlmProviderId) => Promise<boolean>;
};

export const useLlmProviderStore = create<LlmProviderStore>((set, get) => ({
  providers: [],
  loading: false,
  error: null,
  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const providers = await apiFetch<LlmProviderApi[]>("/api/v1/llm-providers");
      set({ providers, loading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load LLM providers",
        loading: false,
      });
    }
  },
  patchProvider: async (id, body) => {
    const payload: Record<string, string> = {};
    if (body.apiKey !== undefined) {
      payload.apiKey = body.apiKey;
    }
    if (body.model !== undefined) {
      payload.model = body.model;
    }
    await apiFetch<LlmProviderApi>(`/api/v1/llm-providers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await get().fetchProviders();
  },
  activateProvider: async (id) => {
    try {
      await apiFetch<void>(`/api/v1/llm-providers/${id}/activate`, {
        method: "POST",
      });
      await get().fetchProviders();
      return true;
    } catch {
      return false;
    }
  },
}));
