from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.suggester import run_suggester_graph
from app.services.attack_test_run_history_service import AttackTestRunHistoryService
from app.services.llm_invocation_service import LlmInvocationService


class AttackTestSuggestionsService:
    def __init__(self, db: AsyncSession):
        self._db = db
        self._history = AttackTestRunHistoryService(db)
        self._llm = LlmInvocationService(db)

    async def suggest_for_step(self, session_id: UUID, run_id: UUID, step_index: int) -> str:
        if step_index < 0:
            raise ValueError("invalid step_index")

        run_row = await self._history.get_for_session(session_id, run_id)
        if run_row is None:
            raise LookupError("test run not found")

        events = run_row.events or []
        judge_ev = next(
            (
                e
                for e in events
                if e.get("event") == "judge_finished" and e.get("index") == step_index
            ),
            None,
        )
        agent_ev = next(
            (
                e
                for e in events
                if e.get("event") == "agent_finished" and e.get("index") == step_index
            ),
            None,
        )

        if not judge_ev:
            raise LookupError("judge event not found")
        if not agent_ev:
            raise LookupError("agent event not found")

        verdict = judge_ev.get("verdict") or judge_ev.get("judge_verdict")
        if verdict != "vulnerable":
            raise ValueError("suggestions are only available for vulnerable results")

        response_preview = agent_ev.get("responsePreview") or agent_ev.get("response_preview")
        if not isinstance(response_preview, str) or not response_preview.strip():
            raise ValueError("missing vulnerable agent response")

        judge_constraint_summary = (
            judge_ev.get("judgeConstraintSummary") or judge_ev.get("judge_constraint_summary")
        )
        if not isinstance(judge_constraint_summary, dict) or not judge_constraint_summary:
            raise ValueError("missing judge constraint summary")

        llm = await self._llm.get_active_chat_model()
        return await run_suggester_graph(
            llm,
            judge_constraint_summary=judge_constraint_summary,
            response_preview=response_preview,
        )
