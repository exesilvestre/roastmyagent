from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt_secret
from app.models.llm_provider_config import AppSettings, LlmProviderConfig

PROVIDER_LABELS: dict[str, str] = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "gemini": "Gemini",
}

PROVIDER_ORDER = ("openai", "anthropic", "gemini")


async def _get_settings_row(db: AsyncSession) -> AppSettings:
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = AppSettings(id=1, active_provider_id=None)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def _get_provider(db: AsyncSession, provider_id: str) -> LlmProviderConfig | None:
    result = await db.execute(
        select(LlmProviderConfig).where(LlmProviderConfig.id == provider_id)
    )
    return result.scalar_one_or_none()


def _row_to_public(row: LlmProviderConfig, active_id: str | None) -> dict[str, Any]:
    has_key = bool(row.encrypted_api_key and row.encrypted_api_key.strip())
    return {
        "id": row.id,
        "label": PROVIDER_LABELS.get(row.id, row.id),
        "model": row.model,
        "has_api_key": has_key,
        "is_active": active_id == row.id,
    }


async def get_provider_public(db: AsyncSession, provider_id: str) -> dict[str, Any] | None:
    if provider_id not in PROVIDER_LABELS:
        return None
    row = await _get_provider(db, provider_id)
    if row is None:
        return None
    settings_row = await _get_settings_row(db)
    return _row_to_public(row, settings_row.active_provider_id)


async def list_providers(db: AsyncSession) -> list[dict[str, Any]]:
    settings_row = await _get_settings_row(db)
    out: list[dict[str, Any]] = []
    for pid in PROVIDER_ORDER:
        row = await _get_provider(db, pid)
        if row is None:
            continue
        out.append(_row_to_public(row, settings_row.active_provider_id))
    return out


async def update_provider(
    db: AsyncSession,
    provider_id: str,
    patch: dict[str, Any],
) -> LlmProviderConfig | None:
    if provider_id not in PROVIDER_LABELS:
        return None
    row = await _get_provider(db, provider_id)
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
    await db.commit()
    await db.refresh(row)
    return row


def _is_ready(row: LlmProviderConfig) -> bool:
    if not row.model or not row.model.strip():
        return False
    if not row.encrypted_api_key or not row.encrypted_api_key.strip():
        return False
    return True


async def activate_provider(db: AsyncSession, provider_id: str) -> bool:
    if provider_id not in PROVIDER_LABELS:
        return False
    row = await _get_provider(db, provider_id)
    if row is None or not _is_ready(row):
        return False
    settings_row = await _get_settings_row(db)
    settings_row.active_provider_id = provider_id
    await db.commit()
    return True
