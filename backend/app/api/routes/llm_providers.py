import httpx
from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.core.config import settings
from app.schemas.llm_provider import LlmProviderOut, LlmProviderUpdate, OllamaHealthOut
from app.services.llm_invocation_service.llm_invocation_service import ProviderPingError
from app.services.llm_provider_service.llm_provider_service import LlmProviderService

router = APIRouter()


@router.get("/ollama/health", response_model=OllamaHealthOut)
async def ollama_health() -> OllamaHealthOut:
    # Route for checking the health of the Ollama server.
    base = settings.ollama_base_url.rstrip("/")
    url = f"{base}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            return OllamaHealthOut(ok=response.is_success)
    except (httpx.HTTPError, OSError, ValueError):
        return OllamaHealthOut(ok=False)


@router.get("", response_model=list[LlmProviderOut])
async def list_llm_providers(db: DbSession) -> list[LlmProviderOut]:
    # Route for listing all the available LLM providers.
    service = LlmProviderService(db)
    rows = await service.list_providers()
    return [LlmProviderOut.model_validate(r) for r in rows]


@router.patch("/{provider_id}", response_model=LlmProviderOut)
async def update_llm_provider(
    provider_id: str,
    body: LlmProviderUpdate,
    db: DbSession,
) -> LlmProviderOut:
    # Route for updating the settings of a LLM provider.
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
    # Route for activating a LLM provider.
    service = LlmProviderService(db)
    try:
        ok = await service.activate_provider(provider_id)
    except ProviderPingError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="provider is not ready to activate (configure model and API key for cloud providers; model only for local Ollama)",
        )
