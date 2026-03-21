from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import DbSession
from app.schemas.session import SessionCreate, SessionOut, SessionUpdate
from app.services import evaluation_session_service as session_svc

router = APIRouter()


@router.get("", response_model=list[SessionOut])
async def list_sessions(db: DbSession) -> list[SessionOut]:
    rows = await session_svc.list_sessions(db)
    return [SessionOut.model_validate(r) for r in rows]


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate, db: DbSession) -> SessionOut:
    row = await session_svc.create_session(
        db,
        body.title,
        agent_description=body.agent_description,
    )
    return SessionOut.model_validate(row)


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: UUID,
    body: SessionUpdate,
    db: DbSession,
) -> SessionOut:
    row = await session_svc.update_session(db, session_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return SessionOut.model_validate(row)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: UUID, db: DbSession) -> Response:
    ok = await session_svc.delete_session(db, session_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
