from fastapi import APIRouter

from app.schemas.agent_connection import AgentConnectionVerifyBody, AgentConnectionVerifyResult
from app.services.agent_connection_service.agent_connection_service import AgentConnectionService

router = APIRouter()


@router.post("/verify", response_model=AgentConnectionVerifyResult)
async def verify_connection(body: AgentConnectionVerifyBody) -> AgentConnectionVerifyResult:
    r = await AgentConnectionService.verify(
        body.connection_kind,
        dict(body.settings or {}),
        body.secret,
    )
    return AgentConnectionVerifyResult(
        ok=bool(r.get("ok")),
        detail=r.get("detail"),
        preview=r.get("preview"),
    )
