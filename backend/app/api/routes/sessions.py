from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.agents.attacker.context import build_attacker_context
from app.agents.attacker.graph import run_attacker_graph
from app.api.deps import DbSession
from app.schemas.agent_connection import AgentConnectionVerifyResult
from app.schemas.attack_prompts import AttackPromptsGenerateResponse, malicious_items_to_response
from app.schemas.session import SessionCreate, SessionOut, SessionUpdate
from app.services.agent_connection_service.agent_connection_service import AgentConnectionService
from app.services.evaluation_session_service.evaluation_session_service import EvaluationSessionService
from app.services.llm_invocation_service import LlmInvocationService, NoActiveLlmProviderError

router = APIRouter()


@router.get("", response_model=list[SessionOut])
async def list_sessions(db: DbSession) -> list[SessionOut]:
    svc = EvaluationSessionService(db)
    rows = await svc.list_sessions()
    return [svc.session_to_out(r) for r in rows]


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate, db: DbSession) -> SessionOut:
    svc = EvaluationSessionService(db)
    try:
        row = await svc.create_session(
            title=body.title,
            agent_description=body.agent_description,
            agent_connection=body.agent_connection,
        )
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="encryption key not configured",
        ) from None
    return svc.session_to_out(row)


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: UUID,
    body: SessionUpdate,
    db: DbSession,
) -> SessionOut:
    svc = EvaluationSessionService(db)
    row = await svc.update_session(session_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return svc.session_to_out(row)


@router.post(
    "/{session_id}/agent-connection/test",
    response_model=AgentConnectionVerifyResult,
)
async def test_agent_connection(session_id: UUID, db: DbSession) -> AgentConnectionVerifyResult:
    r = await AgentConnectionService(db).verify_stored(session_id)
    return AgentConnectionVerifyResult(
        ok=bool(r.get("ok")),
        detail=r.get("detail"),
        preview=r.get("preview"),
    )


@router.post(
    "/{session_id}/attack-prompts/generate",
    response_model=AttackPromptsGenerateResponse,
)
async def generate_attack_prompts(session_id: UUID, db: DbSession) -> AttackPromptsGenerateResponse:
    svc = EvaluationSessionService(db)
    row = await svc.get_session(session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    try:
        llm = await LlmInvocationService(db).get_active_chat_model()
    except NoActiveLlmProviderError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        if "FERNET_KEY" in str(e) or "not set" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="encryption key not configured",
            ) from e
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    context = build_attacker_context(row)
    try:
        items = await run_attacker_graph(llm, context_text=context)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM generation failed: {e!s}",
        ) from e

    return malicious_items_to_response(items)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: UUID, db: DbSession) -> Response:
    svc = EvaluationSessionService(db)
    ok = await svc.delete_session(session_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)