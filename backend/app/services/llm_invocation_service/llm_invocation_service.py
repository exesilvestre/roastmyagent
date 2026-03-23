import asyncio

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decrypt_secret
from app.models.llm_provider_config import AppSettings, LlmProviderConfig
from app.services.llm_provider_service.constants import PROVIDER_LABELS
from app.services.llm_invocation_service.constants import OPENAI, ANTHROPIC, GEMINI, OLLAMA

PING_TIMEOUT_SECONDS = 60.0
# Any non-empty assistant reply counts as success (models often ignore exact wording).
PING_PROMPT = "Reply briefly to confirm this connection works (one short sentence is fine)."


class NoActiveLlmProviderError(Exception):
    """No active LLM provider or provider is missing model/API key."""


class ProviderPingError(Exception):
    """Raised when a provider does not respond to a minimal test request before activation."""


def _build_chat_model(provider_id: str, *, api_key: str | None, model: str) -> BaseChatModel:
    if provider_id == OPENAI:
        return ChatOpenAI(api_key=api_key or "", model=model)
    if provider_id == ANTHROPIC:
        return ChatAnthropic(api_key=api_key or "", model=model)
    if provider_id == GEMINI:
        return ChatGoogleGenerativeAI(api_key=api_key or "", model=model)
    if provider_id == OLLAMA:
        return ChatOllama(
            model=model,
            base_url=settings.ollama_base_url.rstrip("/"),
        )
    raise NoActiveLlmProviderError(f"unsupported provider: {provider_id}")


class LlmInvocationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _settings_row(self) -> AppSettings:
        result = await self.db.execute(select(AppSettings).where(AppSettings.id == 1))
        row = result.scalar_one_or_none()
        if row is None:
            row = AppSettings(id=1, active_provider_id=None)
            self.db.add(row)
            await self.db.commit()
            await self.db.refresh(row)
        return row

    async def get_active_chat_model(self) -> BaseChatModel:
        settings_row = await self._settings_row()
        active_id = settings_row.active_provider_id
        if not active_id or active_id not in PROVIDER_LABELS:
            raise NoActiveLlmProviderError("no active LLM provider selected")

        result = await self.db.execute(
            select(LlmProviderConfig).where(LlmProviderConfig.id == active_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise NoActiveLlmProviderError("active provider configuration not found")

        if not row.model or not str(row.model).strip():
            raise NoActiveLlmProviderError("active provider has no model configured")
        if active_id == OLLAMA:
            return _build_chat_model(active_id, api_key=None, model=str(row.model).strip())

        if not row.encrypted_api_key or not str(row.encrypted_api_key).strip():
            raise NoActiveLlmProviderError("active provider has no API key configured")

        api_key = decrypt_secret(row.encrypted_api_key)
        return _build_chat_model(active_id, api_key=api_key, model=str(row.model).strip())

    async def verify_provider_responds(self, provider_id: str) -> None:
        """
        Send a minimal chat message to confirm credentials, model, and network work.
        Raises ProviderPingError on failure (caller should not activate the provider).
        """
        if provider_id not in PROVIDER_LABELS:
            raise ProviderPingError("Unknown provider")

        result = await self.db.execute(
            select(LlmProviderConfig).where(LlmProviderConfig.id == provider_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise ProviderPingError("Provider configuration not found")

        model_name = str(row.model).strip() if row.model else ""
        if not model_name:
            raise ProviderPingError("Model is not configured")

        if provider_id == OLLAMA:
            llm = _build_chat_model(OLLAMA, api_key=None, model=model_name)
        else:
            if not row.encrypted_api_key or not str(row.encrypted_api_key).strip():
                raise ProviderPingError("API key is not configured")
            api_key = decrypt_secret(row.encrypted_api_key)
            llm = _build_chat_model(provider_id, api_key=api_key, model=model_name)

        msg = HumanMessage(content=PING_PROMPT)
        try:
            out = await asyncio.wait_for(
                llm.ainvoke([msg]),
                timeout=PING_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            raise ProviderPingError(
                "Timed out waiting for LLM response — check model name, API key, and network."
            ) from None
        except Exception as e:
            raise ProviderPingError(
                f"Provider did not respond: {e!s}"[:400],
            ) from e

        content = getattr(out, "content", None)
        if content is None:
            raise ProviderPingError("Empty response from provider")
        if isinstance(content, list):
            text = "".join(str(block) for block in content)
        else:
            text = str(content)
        # Do not require "pong" — a conversational reply still proves the channel works.
        if not text.strip():
            raise ProviderPingError("Empty response from provider")
