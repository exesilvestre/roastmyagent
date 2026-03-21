from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.schemas.llm_provider import LlmProviderOut, LlmProviderUpdate
from app.services.llm_provider_service.llm_provider_service import LlmProviderService

router = APIRouter()


@router.get("", response_model=list[LlmProviderOut])
async def list_llm_providers(db: DbSession) -> list[LlmProviderOut]:
    service = LlmProviderService(db)
    rows = await service.list_providers()
    return [LlmProviderOut.model_validate(r) for r in rows]


@router.patch("/{provider_id}", response_model=LlmProviderOut)
async def update_llm_provider(
    provider_id: str,
    body: LlmProviderUpdate,
    db: DbSession,
) -> LlmProviderOut:
    service = LlmProviderService(db)
    patch = body.model_dump(exclude_unset=True)

    try:
        row = await service.update_provider(provider_id, patch)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="encryption key not configured",
        ) from None

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="provider not found")

    view = await service.get_provider_public(provider_id)
    if view is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="state")

    return LlmProviderOut.model_validate(view)


@router.post("/{provider_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_llm_provider(provider_id: str, db: DbSession) -> None:
    service = LlmProviderService(db)
    ok = await service.activate_provider(provider_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="provider must have model and API key configured",
        )