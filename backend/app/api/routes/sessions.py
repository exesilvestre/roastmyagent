import json
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import StreamingResponse

from app.agents.attacker.context import build_attacker_context
from app.agents.attacker.graph import run_attacker_graph
from app.api.deps import DbSession
from app.schemas.agent_connection import AgentConnectionVerifyResult
from app.schemas.attack_prompts import (
    AttackPromptsListResponse,
    AttackPromptsSaveRequest,
    AttackTestRunRequest,
    AttackTestRunResponse,
    AttackTestStepResult,
    malicious_items_to_preview_response,
    rows_to_list_response,
)
from app.schemas.attack_test_runs import AttackTestRunDetailOut, AttackTestRunListItem
from app.schemas.attack_test_stream import RunSavedEvent
from app.services.attack_prompt_service.attack_prompt_service import AttackPromptService
from app.services.attack_test_run_export import attack_test_run_to_xlsx_bytes, prompt_text_map_from_rows
from app.services.attack_test_run_history_service import AttackTestRunHistoryService
from app.services.attack_test_service.attack_test_service import AttackTestService
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


@router.get(
    "/{session_id}/attack-prompts",
    response_model=AttackPromptsListResponse,
)
async def list_attack_prompts(session_id: UUID, db: DbSession) -> AttackPromptsListResponse:
    rows = await AttackPromptService(db).list_for_session(session_id)
    if rows is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return rows_to_list_response(rows)


@router.put(
    "/{session_id}/attack-prompts",
    response_model=AttackPromptsListResponse,
)
async def save_attack_prompts(
    session_id: UUID,
    body: AttackPromptsSaveRequest,
    db: DbSession,
) -> AttackPromptsListResponse:
    rows = await AttackPromptService(db).replace_prompts(session_id, body.prompts)
    if rows is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return rows_to_list_response(rows)


@router.post(
    "/{session_id}/attack-prompts/generate",
    response_model=AttackPromptsListResponse,
)
async def generate_attack_prompts(session_id: UUID, db: DbSession) -> AttackPromptsListResponse:
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

    return malicious_items_to_preview_response(items)


@router.post(
    "/{session_id}/attack-prompts/run",
    response_model=AttackTestRunResponse,
)
async def run_attack_prompts_test(
    session_id: UUID,
    body: AttackTestRunRequest,
    db: DbSession,
) -> AttackTestRunResponse:
    svc = EvaluationSessionService(db)
    row = await svc.get_session(session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if not body.prompt_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="select at least one prompt",
        )

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

    try:
        raw_steps = await AttackTestService(db).run(
            session_id,
            body.prompt_ids,
            body.delay_seconds,
            llm,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    events = AttackTestService.build_events_from_step_results(raw_steps)
    await AttackTestRunHistoryService(db).save_completed_run(
        session_id,
        body.delay_seconds,
        events,
    )

    return AttackTestRunResponse(
        steps=[AttackTestStepResult(**s) for s in raw_steps],
    )


@router.post("/{session_id}/attack-prompts/run/stream")
async def run_attack_prompts_test_stream(
    session_id: UUID,
    body: AttackTestRunRequest,
    db: DbSession,
) -> StreamingResponse:
    """SSE progress for the attack test (HTTP + judge phases), not LLM token streaming."""
    svc = EvaluationSessionService(db)
    row = await svc.get_session(session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if not body.prompt_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="select at least one prompt",
        )

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

    test_svc = AttackTestService(db)
    hist_svc = AttackTestRunHistoryService(db)

    async def sse() -> AsyncIterator[bytes]:
        collected: list[dict] = []
        async for ev in test_svc.iter_run_events(
            session_id,
            body.prompt_ids,
            body.delay_seconds,
            llm,
        ):
            collected.append(ev)
            line = json.dumps(ev, ensure_ascii=False)
            yield f"data: {line}\n\n".encode("utf-8")
        if collected and collected[-1].get("event") == "run_finished":
            run_id = await hist_svc.save_completed_run(
                session_id,
                body.delay_seconds,
                collected,
            )
            if run_id is not None:
                saved = RunSavedEvent(run_id=run_id).model_dump(mode="json", by_alias=True)
                yield f"data: {json.dumps(saved, ensure_ascii=False)}\n\n".encode("utf-8")

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/{session_id}/attack-test-runs",
    response_model=list[AttackTestRunListItem],
)
async def list_attack_test_runs(session_id: UUID, db: DbSession) -> list[AttackTestRunListItem]:
    svc = EvaluationSessionService(db)
    if await svc.get_session(session_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    rows = await AttackTestRunHistoryService(db).list_for_session(session_id)
    return [
        AttackTestRunListItem(
            id=r.id,
            created_at=r.created_at,
            delay_seconds=r.delay_seconds,
            total_steps=r.total_steps,
            ok_count=r.ok_count,
            fail_count=r.fail_count,
        )
        for r in rows
    ]


@router.get(
    "/{session_id}/attack-test-runs/{run_id}",
    response_model=AttackTestRunDetailOut,
)
async def get_attack_test_run(
    session_id: UUID,
    run_id: UUID,
    db: DbSession,
) -> AttackTestRunDetailOut:
    svc = EvaluationSessionService(db)
    if await svc.get_session(session_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    row = await AttackTestRunHistoryService(db).get_for_session(session_id, run_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="test run not found")
    return AttackTestRunDetailOut(
        id=row.id,
        created_at=row.created_at,
        delay_seconds=row.delay_seconds,
        total_steps=row.total_steps,
        ok_count=row.ok_count,
        fail_count=row.fail_count,
        events=row.events,
    )


@router.get(
    "/{session_id}/attack-test-runs/{run_id}/export",
)
async def export_attack_test_run_excel(
    session_id: UUID,
    run_id: UUID,
    db: DbSession,
) -> Response:
    svc = EvaluationSessionService(db)
    if await svc.get_session(session_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    row = await AttackTestRunHistoryService(db).get_for_session(session_id, run_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="test run not found")
    prompts = await AttackPromptService(db).list_for_session(session_id)
    prompt_map = prompt_text_map_from_rows(prompts or [])
    body = attack_test_run_to_xlsx_bytes(row, prompt_map)
    filename = f"attack-test-run-{run_id}.xlsx"
    return Response(
        content=body,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: UUID, db: DbSession) -> Response:
    svc = EvaluationSessionService(db)
    ok = await svc.delete_session(session_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)