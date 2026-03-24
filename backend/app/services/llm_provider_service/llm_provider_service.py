from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import encrypt_secret
from app.models.llm_provider_config import AppSettings, LlmProviderConfig
from app.services.llm_invocation_service.llm_invocation_service import LlmInvocationService

from .constants import PROVIDER_LABELS, PROVIDER_ORDER, PING_TIMEOUT_SECONDS, PING_PROMPT, OLLAMA_ID



class LlmProviderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_settings_row(self) -> AppSettings:
        result = await self.db.execute(select(AppSettings).where(AppSettings.id == 1))
        row = result.scalar_one_or_none()
        if row is None:
            row = AppSettings(id=1, active_provider_id=None)
            self.db.add(row)
            await self.db.commit()
            await self.db.refresh(row)
        return row

    async def _get_provider(self, provider_id: str) -> LlmProviderConfig | None:
        result = await self.db.execute(
            select(LlmProviderConfig).where(LlmProviderConfig.id == provider_id)
        )
        return result.scalar_one_or_none()

    def _row_to_public(self, row: LlmProviderConfig, active_id: str | None) -> dict[str, Any]:
        """Convierte la fila del proveedor a un diccionario público para la API."""
        has_key = bool(row.encrypted_api_key and row.encrypted_api_key.strip())
        return {
            "id": row.id,
            "label": PROVIDER_LABELS.get(row.id, row.id),
            "model": row.model,
            "has_api_key": has_key,
            "is_active": active_id == row.id,
        }

    def _is_ready(self, row: LlmProviderConfig) -> bool:
        if not row.model or not row.model.strip():
            return False
        if row.id == OLLAMA_ID:
            return True
        if not row.encrypted_api_key or not row.encrypted_api_key.strip():
            return False
        return True

    async def get_provider_public(self, provider_id: str) -> dict[str, Any] | None:
        if provider_id not in PROVIDER_LABELS:
            return None
        row = await self._get_provider(provider_id)
        if row is None:
            return None
        settings_row = await self._get_settings_row()
        return self._row_to_public(row, settings_row.active_provider_id)

    async def list_providers(self) -> list[dict[str, Any]]:
        settings_row = await self._get_settings_row()
        result = await self.db.execute(
            select(LlmProviderConfig).where(LlmProviderConfig.id.in_(list(PROVIDER_ORDER)))
        )
        by_id = {r.id: r for r in result.scalars().all()}
        out: list[dict[str, Any]] = []
        for pid in PROVIDER_ORDER:
            row = by_id.get(pid)
            if row is None:
                continue
            out.append(self._row_to_public(row, settings_row.active_provider_id))
        return out

    async def update_provider(self, provider_id: str, patch: dict[str, Any]) -> LlmProviderConfig | None:
        if provider_id not in PROVIDER_LABELS:
            return None
        row = await self._get_provider(provider_id)
        if row is None:
            return None
        if "api_key" in patch:
            api_key = patch["api_key"]
            if api_key is None or (isinstance(api_key, str) and api_key.strip() == ""):
                row.encrypted_api_key = None
            else:
                row.encrypted_api_key = encrypt_secret(str(api_key).strip())
        if "model" in patch:
            model = patch["model"]
            if model is None or (isinstance(model, str) and model.strip() == ""):
                row.model = None
            else:
                row.model = str(model).strip()
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def activate_provider(self, provider_id: str) -> bool:
        if provider_id not in PROVIDER_LABELS:
            return False
        row = await self._get_provider(provider_id)
        if row is None or not self._is_ready(row):
            return False
        # Confirm the provider answers before switching active (same path the app uses at runtime).
        await LlmInvocationService(self.db).verify_provider_responds(provider_id)
        settings_row = await self._get_settings_row()
        settings_row.active_provider_id = provider_id
        await self.db.commit()
        return True


# reviewed