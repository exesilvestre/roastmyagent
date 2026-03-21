from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_secret
from app.models.llm_provider_config import AppSettings, LlmProviderConfig
from app.services.llm_provider_service.constants import PROVIDER_LABELS


class NoActiveLlmProviderError(Exception):
    """No active LLM provider or provider is missing model/API key."""


def _build_chat_model(provider_id: str, *, api_key: str, model: str) -> BaseChatModel:
    if provider_id == "openai":
        return ChatOpenAI(api_key=api_key, model=model)
    if provider_id == "anthropic":
        return ChatAnthropic(api_key=api_key, model=model)
    if provider_id == "gemini":
        return ChatGoogleGenerativeAI(api_key=api_key, model=model)
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
        if not row.encrypted_api_key or not str(row.encrypted_api_key).strip():
            raise NoActiveLlmProviderError("active provider has no API key configured")

        api_key = decrypt_secret(row.encrypted_api_key)
        return _build_chat_model(active_id, api_key=api_key, model=str(row.model).strip())
