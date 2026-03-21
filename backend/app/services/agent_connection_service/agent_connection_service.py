from typing import Any
from uuid import UUID
from app.services.agent_connection_service.constants import CONNECTION_KIND_MCP, CONNECTION_KIND_HTTP_LOCAL, CONNECTION_KIND_HTTP_REMOTE_BASIC
from langchain_mcp_adapters.client import MultiServerMCPClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decrypt_secret, encrypt_secret
from app.models.session_agent_connection import SessionAgentConnection
from app.schemas.agent_connection import AgentConnectionCreate, AgentConnectionPublic
from app.services.agent_connection_service.utils import build_mcp_server_config, execute_http_with_settings

class AgentConnectionService:

    @staticmethod
    def _mcp_server_config(settings: dict[str, Any], secret: str | None) -> dict[str, Any]:
        try:
            return build_mcp_server_config(settings, secret)
        except ValueError as e:
            raise ValueError(f"invalid MCP server config: {e}") from e

    @classmethod
    async def verify_mcp(cls, settings: dict[str, Any], secret: str | None) -> dict[str, Any]:
        try:
            servers = cls._mcp_server_config(settings, secret)
        except ValueError as e:
            return {"ok": False, "detail": str(e), "preview": None}

        try:
            client = MultiServerMCPClient(servers)
            tools = await client.get_tools()
        except Exception as e:
            return {"ok": False, "detail": str(e) or "MCP connection failed", "preview": None}

        names: list[str] = []
        for t in tools:
            n = getattr(t, "name", None)
            if n:
                names.append(str(n))
        preview = f"tools: {len(tools)} ({', '.join(names[:12])})"
        return {"ok": True, "detail": None, "preview": preview or None}

    @classmethod
    async def verify_http(
        cls,
        settings: dict[str, Any],
        secret: str | None,
    ) -> dict[str, Any]:
        return await execute_http_with_settings(settings, secret, post_body=None)

    @classmethod
    async def verify(
        cls,
        connection_kind: str,
        settings: dict[str, Any],
        secret: str | None,
    ) -> dict[str, Any]:
        if connection_kind == CONNECTION_KIND_MCP:
            return await cls.verify_mcp(settings, secret)
        if connection_kind in (CONNECTION_KIND_HTTP_LOCAL, CONNECTION_KIND_HTTP_REMOTE_BASIC):
            return await cls.verify_http(settings, secret)
        return {"ok": False, "detail": "unknown connection kind", "preview": None}

    @staticmethod
    def to_public(row: SessionAgentConnection) -> AgentConnectionPublic:
        has = bool(row.encrypted_secret and row.encrypted_secret.strip())
        return AgentConnectionPublic(
            connection_kind=row.connection_kind,
            settings=dict(row.settings or {}),
            has_secret=has,
        )

    @staticmethod
    async def upsert_for_session(
        db: AsyncSession,
        session_id: UUID,
        body: AgentConnectionCreate,
    ) -> SessionAgentConnection:
        result = await db.execute(
            select(SessionAgentConnection).where(
                SessionAgentConnection.session_id == session_id,
            )
        )
        existing = result.scalar_one_or_none()
        secret_val: str | None = None
        if body.secret is not None:
            if str(body.secret).strip() == "":
                secret_val = None
            else:
                secret_val = encrypt_secret(str(body.secret).strip())
        elif existing is not None:
            secret_val = existing.encrypted_secret

        if existing:
            existing.connection_kind = body.connection_kind
            existing.settings = dict(body.settings or {})
            if body.secret is not None:
                existing.encrypted_secret = secret_val
            await db.commit()
            await db.refresh(existing)
            return existing

        row = SessionAgentConnection(
            session_id=session_id,
            connection_kind=body.connection_kind,
            settings=dict(body.settings or {}),
            encrypted_secret=secret_val,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row

    @staticmethod
    async def get_for_session(
        db: AsyncSession,
        session_id: UUID,
    ) -> SessionAgentConnection | None:
        result = await db.execute(
            select(SessionAgentConnection).where(
                SessionAgentConnection.session_id == session_id,
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def verify_stored(cls, db: AsyncSession, session_id: UUID) -> dict[str, Any]:
        row = await cls.get_for_session(db, session_id)
        if row is None:
            return {"ok": False, "detail": "no agent connection", "preview": None}
        secret: str | None = None
        if row.encrypted_secret:
            try:
                secret = decrypt_secret(row.encrypted_secret)
            except ValueError:
                return {"ok": False, "detail": "stored secret is invalid", "preview": None}
        return await cls.verify(row.connection_kind, dict(row.settings or {}), secret)


