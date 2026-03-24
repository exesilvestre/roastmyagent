
PROVIDER_LABELS: dict[str, str] = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "gemini": "Gemini",
    "ollama": "Ollama (local)",
}

PROVIDER_ORDER = ("openai", "anthropic", "gemini", "ollama")

PING_TIMEOUT_SECONDS = 60.0
# Any non-empty assistant reply counts as success (models often ignore exact wording).
PING_PROMPT = "Reply briefly to confirm this connection works (one short sentence is fine)."
OLLAMA_ID = "ollama"
