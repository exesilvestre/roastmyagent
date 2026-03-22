import { apiFetch } from "@/lib/api/client";

export type OllamaHealthApi = {
  ok: boolean;
};

export async function fetchOllamaHealth(): Promise<OllamaHealthApi> {
  return apiFetch<OllamaHealthApi>("/api/v1/llm-providers/ollama/health");
}
