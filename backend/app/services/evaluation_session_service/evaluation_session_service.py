from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import encrypt_secret
from app.models.evaluation_session import EvaluationSession
from app.models.session_agent_connection import SessionAgentConnection
from app.schemas.agent_connection import AgentConnectionCreate
from app.schemas.session import SessionOut, SessionUpdate
from app.services.agent_connection_service.agent_connection_service import AgentConnectionService


class EvaluationSessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_sessions(self) -> List[EvaluationSession]:
        result = await self.db.execute(
            select(EvaluationSession)
            .options(selectinload(EvaluationSession.agent_connection))
            .order_by(EvaluationSession.updated_at.desc())
        )
        return list(result.scalars().all())

    def session_to_out(self, row: EvaluationSession) -> SessionOut:
        ac = None
        if row.agent_connection:
            ac = AgentConnectionService.to_public(row.agent_connection)
        return SessionOut(
            id=row.id,
            title=row.title,
            agent_description=row.agent_description,
            created_at=row.created_at,
            updated_at=row.updated_at,
            agent_connection=ac,
        )

    @staticmethod
    def _normalize_description(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None

    async def create_session(
        self,
        title: str,
        *,
        agent_description: Optional[str] = None,
        agent_connection: Optional[AgentConnectionCreate] = None,
    ) -> EvaluationSession:
        row = EvaluationSession(
            title=title,
            agent_description=self._normalize_description(agent_description),
        )
        self.db.add(row)
        await self.db.flush()

        if agent_connection:
            secret_val: Optional[str] = None
            if agent_connection.secret and agent_connection.secret.strip():
                secret_val = encrypt_secret(agent_connection.secret.strip())
            conn = SessionAgentConnection(
                session_id=row.id,
                connection_kind=agent_connection.connection_kind,
                settings=dict(agent_connection.settings or {}),
                encrypted_secret=secret_val,
            )
            self.db.add(conn)

        await self.db.commit()
        result = await self.db.execute(
            select(EvaluationSession)
            .options(selectinload(EvaluationSession.agent_connection))
            .where(EvaluationSession.id == row.id)
        )
        return result.scalar_one()

    async def get_session(self, session_id: UUID) -> Optional[EvaluationSession]:
        result = await self.db.execute(
            select(EvaluationSession)
            .options(selectinload(EvaluationSession.agent_connection))
            .where(EvaluationSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def delete_session(self, session_id: UUID) -> bool:
        result = await self.db.execute(
            delete(EvaluationSession).where(EvaluationSession.id == session_id)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def update_session(self, session_id: UUID, body: SessionUpdate) -> Optional[EvaluationSession]:
        row = await self.get_session(session_id)
        if row is None:
            return None

        data = body.model_dump(exclude_unset=True)
        if "title" in data:
            row.title = data["title"]
        if "agent_description" in data:
            row.agent_description = self._normalize_description(data["agent_description"])

        row.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return await self.get_session(session_id)