import asyncio
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from langchain_core.language_models.chat_models import BaseChatModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.judge.graph import run_judge_graph
from app.core.security import decrypt_secret
from app.models.session_agent_connection import SessionAgentConnection
from app.models.session_attack_prompt import SessionAttackPrompt
from app.schemas.attack_test_stream import (
    AgentFinishedEvent,
    ErrorEvent,
    JudgeFinishedEvent,
    JudgeStartedEvent,
    RunFinishedEvent,
    RunStartedEvent,
    StepStartedEvent,
)
from app.services.agent_connection_service.constants import (
    CONNECTION_KIND_HTTP_LOCAL,
    CONNECTION_KIND_HTTP_REMOTE_BASIC,
    CONNECTION_KIND_MCP,
)
from app.services.agent_connection_service.utils import (
    build_http_payload_with_prompt,
    execute_http_with_settings,
)


class AttackTestService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def _load_prompts_ordered(
        self,
        session_id: UUID,
        prompt_ids: list[UUID],
    ) -> list[SessionAttackPrompt]:
        if not prompt_ids:
            return []
        result = await self._db.execute(
            select(SessionAttackPrompt).where(
                SessionAttackPrompt.session_id == session_id,
                SessionAttackPrompt.id.in_(prompt_ids),
            ),
        )
        by_id: dict[UUID, SessionAttackPrompt] = {r.id: r for r in result.scalars().all()}
        missing = [pid for pid in prompt_ids if pid not in by_id]
        if missing:
            raise ValueError("one or more prompts are missing or do not belong to this session")
        return [by_id[pid] for pid in prompt_ids]

    async def _require_http_connection(
        self,
        session_id: UUID,
    ) -> tuple[SessionAgentConnection, str | None]:
        conn_result = await self._db.execute(
            select(SessionAgentConnection).where(
                SessionAgentConnection.session_id == session_id,
            ),
        )
        conn = conn_result.scalar_one_or_none()
        if conn is None:
            raise ValueError("no agent connection configured for this session")

        if conn.connection_kind == CONNECTION_KIND_MCP:
            raise ValueError(
                "attack test runs are only supported for HTTP agent connections in this version",
            )

        if conn.connection_kind not in (
            CONNECTION_KIND_HTTP_LOCAL,
            CONNECTION_KIND_HTTP_REMOTE_BASIC,
        ):
            raise ValueError("unsupported agent connection kind for attack test")

        secret: str | None = None
        if conn.encrypted_secret:
            try:
                secret = decrypt_secret(conn.encrypted_secret)
            except ValueError as e:
                raise ValueError("stored secret is invalid") from e

        return conn, secret

    @staticmethod
    async def _http_post_prompt(
        row: SessionAgentConnection,
        prompt_text: str,
        secret: str | None,
    ) -> dict[str, Any]:
        settings = dict(row.settings or {})

        try:
            post_body = build_http_payload_with_prompt(settings, prompt_text)
        except ValueError as e:
            return {"ok": False, "status_code": None, "detail": str(e), "response_preview": None}

        result = await execute_http_with_settings(
            settings,
            secret,
            post_body=post_body,
            include_response_preview=True,
        )
        return {
            "ok": bool(result.get("ok")),
            "status_code": result.get("status_code"),
            "detail": result.get("detail"),
            "response_preview": result.get("response_preview"),
        }

    async def _judge_step(
        self,
        llm: BaseChatModel,
        p: SessionAttackPrompt,
        response_preview: str | None,
    ) -> dict[str, Any]:
        preview = response_preview or ""
        try:
            verdict = await run_judge_graph(
                llm,
                category=p.category,
                intent=p.intent,
                prompt_text=p.prompt_text,
                agent_response_preview=preview,
            )
            return {
                "judge_score": verdict.score,
                "judge_verdict": verdict.verdict,
                "judge_reasoning": verdict.reasoning,
                "judge_failed": False,
                "judge_error": None,
            }
        except Exception as e:
            return {
                "judge_score": None,
                "judge_verdict": None,
                "judge_reasoning": None,
                "judge_failed": True,
                "judge_error": str(e) or "judge failed",
            }

    def _merge_http_and_judge(
        self,
        p: SessionAttackPrompt,
        http: dict[str, Any],
        judge: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "prompt_id": p.id,
            "category": p.category,
            "intent": p.intent,
            "ok": bool(http.get("ok")),
            "status_code": http.get("status_code"),
            "detail": http.get("detail"),
            "response_preview": http.get("response_preview"),
            **judge,
        }

    async def run(
        self,
        session_id: UUID,
        prompt_ids: list[UUID],
        delay_seconds: int,
        llm: BaseChatModel,
    ) -> list[dict[str, Any]]:
        prompts = await self._load_prompts_ordered(session_id, prompt_ids)
        conn, secret = await self._require_http_connection(session_id)

        steps: list[dict[str, Any]] = []
        for i, p in enumerate(prompts):
            http = await self._http_post_prompt(conn, p.prompt_text, secret)
            judge = await self._judge_step(llm, p, http.get("response_preview") if isinstance(http.get("response_preview"), str) else None)
            steps.append(self._merge_http_and_judge(p, http, judge))
            if i < len(prompts) - 1 and delay_seconds > 0:
                await asyncio.sleep(float(delay_seconds))

        return steps

    async def iter_run_events(
        self,
        session_id: UUID,
        prompt_ids: list[UUID],
        delay_seconds: int,
        llm: BaseChatModel,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield progress events for SSE (test pipeline stages, not LLM token streaming)."""
        try:
            prompts = await self._load_prompts_ordered(session_id, prompt_ids)
        except ValueError as e:
            yield ErrorEvent(message=str(e)).model_dump(mode="json", by_alias=True)
            return

        try:
            conn, secret = await self._require_http_connection(session_id)
        except ValueError as e:
            yield ErrorEvent(message=str(e)).model_dump(mode="json", by_alias=True)
            return

        n = len(prompts)
        yield RunStartedEvent(total_steps=n).model_dump(mode="json", by_alias=True)

        ok_count = 0
        fail_count = 0

        for i, p in enumerate(prompts):
            yield StepStartedEvent(
                index=i,
                prompt_id=p.id,
                category=p.category,
                intent=p.intent,
            ).model_dump(mode="json", by_alias=True)

            http = await self._http_post_prompt(conn, p.prompt_text, secret)
            preview = http.get("response_preview") if isinstance(http.get("response_preview"), str) else None

            yield AgentFinishedEvent(
                index=i,
                ok=bool(http.get("ok")),
                status_code=http.get("status_code"),
                detail=http.get("detail"),
                response_preview=preview,
            ).model_dump(mode="json", by_alias=True)

            if http.get("ok"):
                ok_count += 1
            else:
                fail_count += 1

            yield JudgeStartedEvent(index=i).model_dump(mode="json", by_alias=True)

            judge = await self._judge_step(llm, p, preview)
            yield JudgeFinishedEvent(
                index=i,
                score=judge.get("judge_score"),
                verdict=judge.get("judge_verdict"),
                reasoning=judge.get("judge_reasoning"),
                failed=bool(judge.get("judge_failed")),
                error=judge.get("judge_error"),
            ).model_dump(mode="json", by_alias=True)

            if i < n - 1 and delay_seconds > 0:
                await asyncio.sleep(float(delay_seconds))

        yield RunFinishedEvent(ok_count=ok_count, fail_count=fail_count).model_dump(
            mode="json",
            by_alias=True,
        )

    @staticmethod
    def build_events_from_step_results(step_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Rebuild SSE-shaped events from synchronous ``run()`` rows for persistence."""
        if not step_rows:
            return []
        n = len(step_rows)
        out: list[dict[str, Any]] = [
            RunStartedEvent(total_steps=n).model_dump(mode="json", by_alias=True),
        ]
        ok_count = sum(1 for s in step_rows if s.get("ok"))
        fail_count = n - ok_count
        for i, s in enumerate(step_rows):
            pid = s["prompt_id"]
            out.append(
                StepStartedEvent(
                    index=i,
                    prompt_id=pid,
                    category=str(s.get("category") or ""),
                    intent=str(s.get("intent") or ""),
                ).model_dump(mode="json", by_alias=True),
            )
            out.append(
                AgentFinishedEvent(
                    index=i,
                    ok=bool(s.get("ok")),
                    status_code=s.get("status_code"),
                    detail=s.get("detail"),
                    response_preview=s.get("response_preview"),
                ).model_dump(mode="json", by_alias=True),
            )
            out.append(JudgeStartedEvent(index=i).model_dump(mode="json", by_alias=True))
            out.append(
                JudgeFinishedEvent(
                    index=i,
                    score=s.get("judge_score"),
                    verdict=s.get("judge_verdict"),
                    reasoning=s.get("judge_reasoning"),
                    failed=bool(s.get("judge_failed")),
                    error=s.get("judge_error"),
                ).model_dump(mode="json", by_alias=True),
            )
        out.append(
            RunFinishedEvent(ok_count=ok_count, fail_count=fail_count).model_dump(
                mode="json",
                by_alias=True,
            ),
        )
        return out
