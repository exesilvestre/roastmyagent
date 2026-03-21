from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import encrypt_secret
from app.models.evaluation_session import EvaluationSession
from app.models.session_agent_connection import SessionAgentConnection
from app.schemas.agent_connection import AgentConnectionCreate
from app.schemas.session import SessionOut, SessionUpdate
from app.services.agent_connection_service import AgentConnectionService


async def list_sessions(db: AsyncSession) -> list[EvaluationSession]:
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.agent_connection))
        .order_by(EvaluationSession.updated_at.desc())
    )
    return list(result.scalars().all())


def session_to_out(row: EvaluationSession) -> SessionOut:
    ac = None
    if row.agent_connection:
        ac = AgentConnectionService.to_public(row.agent_connection)
    return SessionOut(
        id=row.id,
        title=row.title,
        agent_description=row.agent_description,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        agent_connection=ac,
    )


def _normalize_description(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


async def create_session(
    db: AsyncSession,
    title: str,
    *,
    agent_description: str | None = None,
    agent_connection: AgentConnectionCreate | None = None,
) -> EvaluationSession:
    row = EvaluationSession(
        title=title,
        agent_description=_normalize_description(agent_description),
        status="DRAFT",
    )
    db.add(row)
    await db.flush()
    if agent_connection is not None:
        secret_val: str | None = None
        if agent_connection.secret is not None and str(agent_connection.secret).strip() != "":
            secret_val = encrypt_secret(str(agent_connection.secret).strip())
        conn = SessionAgentConnection(
            session_id=row.id,
            connection_kind=agent_connection.connection_kind,
            settings=dict(agent_connection.settings or {}),
            encrypted_secret=secret_val,
        )
        db.add(conn)
    await db.commit()
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.agent_connection))
        .where(EvaluationSession.id == row.id)
    )
    out = result.scalar_one()
    return out


async def get_session(db: AsyncSession, session_id: UUID) -> EvaluationSession | None:
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.agent_connection))
        .where(EvaluationSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, session_id: UUID) -> bool:
    result = await db.execute(
        delete(EvaluationSession).where(EvaluationSession.id == session_id)
    )
    await db.commit()
    return result.rowcount > 0


async def update_session(
    db: AsyncSession,
    session_id: UUID,
    body: SessionUpdate,
) -> EvaluationSession | None:
    row = await get_session(db, session_id)
    if row is None:
        return None
    data = body.model_dump(exclude_unset=True)
    if "title" in data:
        row.title = data["title"]
    if "agent_description" in data:
        row.agent_description = _normalize_description(data["agent_description"])
    if "status" in data:
        row.status = data["status"]
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_session(db, session_id)
