import asyncio
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_secret
from app.models.session_agent_connection import SessionAgentConnection
from app.models.session_attack_prompt import SessionAttackPrompt
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
            return {"ok": False, "status_code": None, "detail": str(e)}

        result = await execute_http_with_settings(settings, secret, post_body=post_body)
        return {
            "ok": bool(result.get("ok")),
            "status_code": result.get("status_code"),
            "detail": result.get("detail"),
        }

    async def run(
        self,
        session_id: UUID,
        prompt_ids: list[UUID],
        delay_seconds: int,
    ) -> list[dict[str, Any]]:
        prompts = await self._load_prompts_ordered(session_id, prompt_ids)
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

        steps: list[dict[str, Any]] = []
        for i, p in enumerate(prompts):
            result = await self._http_post_prompt(conn, p.prompt_text, secret)
            steps.append(
                {
                    "prompt_id": p.id,
                    "ok": bool(result.get("ok")),
                    "status_code": result.get("status_code"),
                    "detail": result.get("detail"),
                },
            )
            if i < len(prompts) - 1 and delay_seconds > 0:
                await asyncio.sleep(float(delay_seconds))

        return steps
