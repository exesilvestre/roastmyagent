import json
from typing import Any, Tuple

import httpx

from app.services.agent_connection_service.constants import (
    AUTH_TYPE_BASIC,
    AUTH_TYPE_BEARER,
    AUTH_TYPE_NONE,
    DEFAULT_HTTP_METHOD,
    DEFAULT_TIMEOUT,
    DEFAULT_TRANSPORT,
    HTTP_METHOD_GET,
    HTTP_METHOD_POST,
    TRANSPORT_HTTP,
    TRANSPORT_SSE,
    TRANSPORT_STDIO,
)


def build_http_payload(settings: dict[str, Any]) -> Tuple[bytes, str]:
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


def resolve_http_auth(settings: dict[str, Any], secret: str | None):
    auth: httpx.Auth | None = None
    headers: dict[str, str] = {}

    raw_auth = (settings.get("authType") or "").strip().lower()

    if not raw_auth:
        if (settings.get("username") or "").strip():
            auth_type = AUTH_TYPE_BASIC
        elif secret and str(secret).strip():
            auth_type = AUTH_TYPE_BEARER
        else:
            auth_type = AUTH_TYPE_NONE
    else:
        auth_type = raw_auth

    if auth_type == AUTH_TYPE_BEARER:
        if not secret or not str(secret).strip():
            raise ValueError("bearer token is required")
        headers["Authorization"] = f"Bearer {str(secret).strip()}"

    elif auth_type == AUTH_TYPE_BASIC:
        user = (settings.get("username") or "").strip()
        if not user:
            raise ValueError("username is required")
        if not secret or not str(secret).strip():
            raise ValueError("password is required")
        auth = httpx.BasicAuth(user, str(secret).strip())

    return auth, headers


def get_http_method(settings: dict[str, Any]) -> str:
    method = (settings.get("httpMethod") or settings.get("http_method") or DEFAULT_HTTP_METHOD).upper()

    if method not in (HTTP_METHOD_GET, HTTP_METHOD_POST):
        raise ValueError(f"httpMethod must be {HTTP_METHOD_GET} or {HTTP_METHOD_POST}")

    return method


def get_http_timeout() -> httpx.Timeout:
    return httpx.Timeout(DEFAULT_TIMEOUT)


def build_mcp_server_config(settings: dict[str, Any], secret: str | None) -> dict[str, Any]:
    name = "target"
    transport = (settings.get("transport") or DEFAULT_TRANSPORT).strip().lower()

    headers: dict[str, str] = {}
    if secret and secret.strip():
        headers["Authorization"] = f"{AUTH_TYPE_BEARER} {secret.strip()}"

    if transport == TRANSPORT_STDIO:
        cmd = settings.get("command")
        if not cmd or not str(cmd).strip():
            raise ValueError("command is required for stdio MCP")

        args = settings.get("args") or []
        if not isinstance(args, list):
            raise ValueError("args must be a list of strings")

        return {
            name: {
                "transport": TRANSPORT_STDIO,
                "command": str(cmd).strip(),
                "args": [str(a) for a in args],
            }
        }

    url = (settings.get("url") or "").strip()
    if not url:
        raise ValueError("url is required for MCP")

    if transport == TRANSPORT_SSE:
        block = {"transport": TRANSPORT_SSE, "url": url}
    else:
        block = {"transport": TRANSPORT_HTTP, "url": url}

    if headers:
        block["headers"] = headers

    return {name: block}