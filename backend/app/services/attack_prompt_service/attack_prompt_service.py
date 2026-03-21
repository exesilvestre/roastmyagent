from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation_session import EvaluationSession
from app.models.session_attack_prompt import SessionAttackPrompt
from app.schemas.attack_prompts import AttackPromptDraft


class AttackPromptService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_session(self, session_id: UUID) -> list[SessionAttackPrompt] | None:
        row = await self.db.get(EvaluationSession, session_id)
        if row is None:
            return None
        result = await self.db.execute(
            select(SessionAttackPrompt)
            .where(SessionAttackPrompt.session_id == session_id)
            .order_by(SessionAttackPrompt.sort_order.asc())
        )
        return list(result.scalars().all())

    async def replace_prompts(
        self,
        session_id: UUID,
        prompts: list[AttackPromptDraft],
    ) -> list[SessionAttackPrompt] | None:
        row = await self.db.get(EvaluationSession, session_id)
        if row is None:
            return None

        await self.db.execute(
            delete(SessionAttackPrompt).where(SessionAttackPrompt.session_id == session_id)
        )

        for i, p in enumerate(prompts):
            cat = p.category.strip()
            intent = p.intent.strip()
            text = p.prompt_text.strip()
            rationale = p.rationale.strip() if p.rationale else ""
            rationale_val: str | None = rationale if rationale else None
            self.db.add(
                SessionAttackPrompt(
                    session_id=session_id,
                    sort_order=i,
                    category=cat,
                    intent=intent,
                    prompt_text=text,
                    rationale=rationale_val,
                )
            )

        await self.db.commit()

        result = await self.db.execute(
            select(SessionAttackPrompt)
            .where(SessionAttackPrompt.session_id == session_id)
            .order_by(SessionAttackPrompt.sort_order.asc())
        )
        return list(result.scalars().all())
