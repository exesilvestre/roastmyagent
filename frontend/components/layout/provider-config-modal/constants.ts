import type { CloudLlmProviderId } from "@/lib/types/llm-provider";

export const CLOUD_PROVIDER_ORDER: CloudLlmProviderId[] = ["openai", "anthropic", "gemini"];

export const DEFAULT_OLLAMA_MODEL = "llama3";

export const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";

export const OLLAMA_BASE_URL_DEFAULT = "http://host.docker.internal:11434";