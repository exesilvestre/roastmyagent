from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session_attack_test_run import SessionAttackTestRun


class AttackTestRunHistoryService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def save_completed_run(
        self,
        session_id: UUID,
        delay_seconds: int,
        events: list[dict[str, Any]],
    ) -> UUID | None:
        """Persist a finished test when the last event is ``run_finished``."""
        if not events:
            return None
        last = events[-1]
        if last.get("event") != "run_finished":
            return None
        ok_count = int(last.get("okCount", last.get("ok_count", 0)))
        fail_count = int(last.get("failCount", last.get("fail_count", 0)))
        total_steps = 0
        if events and events[0].get("event") == "run_started":
            total_steps = int(events[0].get("totalSteps", events[0].get("total_steps", 0)))
        row = SessionAttackTestRun(
            session_id=session_id,
            delay_seconds=delay_seconds,
            total_steps=total_steps,
            ok_count=ok_count,
            fail_count=fail_count,
            events=events,
        )
        self._db.add(row)
        await self._db.commit()
        await self._db.refresh(row)
        return row.id

    async def list_for_session(self, session_id: UUID) -> list[SessionAttackTestRun]:
        result = await self._db.execute(
            select(SessionAttackTestRun)
            .where(SessionAttackTestRun.session_id == session_id)
            .order_by(SessionAttackTestRun.created_at.desc()),
        )
        return list(result.scalars().all())

    async def get_for_session(
        self,
        session_id: UUID,
        run_id: UUID,
    ) -> SessionAttackTestRun | None:
        result = await self._db.execute(
            select(SessionAttackTestRun).where(
                SessionAttackTestRun.id == run_id,
                SessionAttackTestRun.session_id == session_id,
            ),
        )
        return result.scalar_one_or_none()
