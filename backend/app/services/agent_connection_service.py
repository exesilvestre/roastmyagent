import json
from typing import Any
from uuid import UUID

import httpx
from langchain_mcp_adapters.client import MultiServerMCPClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decrypt_secret, encrypt_secret
from app.models.session_agent_connection import SessionAgentConnection
from app.schemas.agent_connection import AgentConnectionCreate, AgentConnectionPublic

_PREVIEW_MAX = 600


class AgentConnectionService:
    @staticmethod
    def _preview(text: str) -> str:
        t = text.strip()
        if len(t) <= _PREVIEW_MAX:
            return t
        return t[:_PREVIEW_MAX] + "…"

    @staticmethod
    def _mcp_server_config(settings: dict[str, Any], secret: str | None) -> dict[str, Any]:
        name = "target"
        transport = (settings.get("transport") or "http").strip().lower()
        headers: dict[str, str] = {}
        if secret and secret.strip():
            headers["Authorization"] = f"Bearer {secret.strip()}"

        if transport == "stdio":
            cmd = settings.get("command")
            if not cmd or not str(cmd).strip():
                raise ValueError("command is required for stdio MCP")
            args = settings.get("args")
            if args is None:
                args = []
            if not isinstance(args, list):
                raise ValueError("args must be a list of strings")
            return {
                name: {
                    "transport": "stdio",
                    "command": str(cmd).strip(),
                    "args": [str(a) for a in args],
                }
            }

        url = (settings.get("url") or "").strip()
        if not url:
            raise ValueError("url is required for MCP")

        if transport == "sse":
            block: dict[str, Any] = {"transport": "sse", "url": url}
            if headers:
                block["headers"] = headers
            return {name: block}

        block = {"transport": "http", "url": url}
        if headers:
            block["headers"] = headers
        return {name: block}

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
        return {"ok": True, "detail": None, "preview": cls._preview(preview)}

    @staticmethod
    def _http_post_payload(settings: dict[str, Any]) -> tuple[bytes, str]:
        body_kind = (settings.get("bodyKind") or settings.get("body_kind") or "json").lower()
        raw = settings.get("bodyContent")
        if body_kind == "text":
            text = raw.strip() if isinstance(raw, str) and raw.strip() else "hello"
            return text.encode("utf-8"), "text/plain; charset=utf-8"
        json_str = raw.strip() if isinstance(raw, str) and raw.strip() else '{"message":"hello"}'
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"invalid JSON body: {e}") from e
        return json.dumps(parsed).encode("utf-8"), "application/json; charset=utf-8"

    @classmethod
    async def verify_http(
        cls,
        settings: dict[str, Any],
        secret: str | None,
    ) -> dict[str, Any]:
        url = (settings.get("url") or "").strip()
        if not url:
            return {"ok": False, "detail": "url is required", "preview": None}

        method = (settings.get("httpMethod") or settings.get("http_method") or "POST").upper()
        if method not in ("GET", "POST"):
            return {"ok": False, "detail": "httpMethod must be GET or POST", "preview": None}

        auth: httpx.Auth | None = None
        extra_headers: dict[str, str] = {}
        raw_auth = (settings.get("authType") or "").strip().lower()
        if not raw_auth:
            if (settings.get("username") or "").strip():
                auth_type = "basic"
            elif secret and str(secret).strip():
                auth_type = "bearer"
            else:
                auth_type = "none"
        else:
            auth_type = raw_auth
        if auth_type == "bearer":
            if not secret or not str(secret).strip():
                return {"ok": False, "detail": "bearer token is required", "preview": None}
            extra_headers["Authorization"] = f"Bearer {str(secret).strip()}"
        elif auth_type == "basic":
            user = (settings.get("username") or "").strip()
            if not user:
                return {"ok": False, "detail": "username is required", "preview": None}
            if not secret or not str(secret).strip():
                return {"ok": False, "detail": "password is required", "preview": None}
            auth = httpx.BasicAuth(user, str(secret).strip())

        timeout = httpx.Timeout(20.0)
        try:
            async with httpx.AsyncClient(timeout=timeout, auth=auth) as client:
                if method == "GET":
                    r = await client.get(url, headers=extra_headers or None)
                else:
                    try:
                        body_bytes, content_type = cls._http_post_payload(settings)
                    except ValueError as e:
                        return {"ok": False, "detail": str(e), "preview": None}
                    r = await client.post(
                        url,
                        content=body_bytes,
                        headers={
                            "Content-Type": content_type,
                            **extra_headers,
                        },
                    )
        except Exception as e:
            return {"ok": False, "detail": str(e) or "request failed", "preview": None}

        text = r.text or ""
        preview = f"HTTP {r.status_code} {cls._preview(text)}"
        ok = 200 <= r.status_code < 300
        return {
            "ok": ok,
            "detail": None if ok else f"HTTP {r.status_code}",
            "preview": cls._preview(preview),
        }

    @classmethod
    async def verify(
        cls,
        connection_kind: str,
        settings: dict[str, Any],
        secret: str | None,
    ) -> dict[str, Any]:
        if connection_kind == "MCP":
            return await cls.verify_mcp(settings, secret)
        if connection_kind in ("HTTP_LOCAL", "HTTP_REMOTE_BASIC"):
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


