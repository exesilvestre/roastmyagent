from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation_session import EvaluationSession
from app.schemas.session import SessionUpdate


async def list_sessions(db: AsyncSession) -> list[EvaluationSession]:
    result = await db.execute(
        select(EvaluationSession).order_by(EvaluationSession.updated_at.desc())
    )
    return list(result.scalars().all())


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
) -> EvaluationSession:
    row = EvaluationSession(
        title=title,
        agent_description=_normalize_description(agent_description),
        status="DRAFT",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_session(db: AsyncSession, session_id: UUID) -> EvaluationSession | None:
    result = await db.execute(
        select(EvaluationSession).where(EvaluationSession.id == session_id)
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
    await db.refresh(row)
    return row
