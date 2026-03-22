import json
import os
from typing import Any, Tuple
from urllib.parse import urlparse, urlunparse

import httpx

from app.services.agent_connection_service.constants import (
    AUTH_TYPE_BASIC,
    AUTH_TYPE_BEARER,
    AUTH_TYPE_NONE,
    CONNECTION_KIND_HTTP_LOCAL,
    DEFAULT_HTTP_METHOD,
    DEFAULT_TIMEOUT,
    HTTP_METHOD_POST,
)


def merge_attack_prompt_into_json_body(obj: dict[str, Any], prompt_text: str) -> dict[str, Any]:
    """Inject prompt text into a JSON template; prefers common field names."""
    out = dict(obj)
    for key in ("message", "prompt", "text", "query", "input", "content"):
        if key in out:
            out[key] = prompt_text
            return out
    out["message"] = prompt_text
    return out


def build_http_payload_with_prompt(settings: dict[str, Any], prompt_text: str) -> Tuple[bytes, str]:
    """Build HTTP body for an attack request, replacing or adding the user message field."""
    body_kind = (settings.get("bodyKind") or settings.get("body_kind") or "json").lower()
    raw = settings.get("bodyContent")

    if body_kind == "text":
        text = prompt_text.strip() if prompt_text.strip() else " "
        return text.encode("utf-8"), "text/plain; charset=utf-8"

    json_str = raw.strip() if isinstance(raw, str) and raw.strip() else "{}"
    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON body: {e}") from e

    if isinstance(parsed, dict):
        merged = merge_attack_prompt_into_json_body(parsed, prompt_text)
        return json.dumps(merged).encode("utf-8"), "application/json; charset=utf-8"

    return json.dumps({"message": prompt_text}).encode("utf-8"), "application/json; charset=utf-8"


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

    return method


def get_http_timeout() -> httpx.Timeout:
    return httpx.Timeout(DEFAULT_TIMEOUT)


def normalize_agent_url(url: str) -> str:
    """Ensure http(s) scheme so httpx accepts the URL (users often omit ``http://``)."""
    t = (url or "").strip()
    if not t:
        return ""
    lower = t.lower()
    if lower.startswith("http://") or lower.startswith("https://"):
        return t
    return f"http://{t}"


def _api_process_in_container() -> bool:
    """True when this Python process runs inside Docker (API container)."""
    return os.path.exists("/.dockerenv")


def rewrite_loopback_host_for_local_agent(url: str) -> str:
    """
    For HTTP_LOCAL, map loopback hosts to host.docker.internal so requests from the API
    container reach services on the host. Remote connections must not use this.
    """
    try:
        p = urlparse(url)
    except Exception:
        return url
    host = (p.hostname or "").lower()
    if host not in ("localhost", "127.0.0.1", "::1"):
        return url
    auth = ""
    if p.username is not None:
        auth = p.username
        if p.password:
            auth += f":{p.password}"
        auth += "@"
    hostport = "host.docker.internal"
    if p.port:
        hostport += f":{p.port}"
    netloc = auth + hostport
    return urlunparse((p.scheme, netloc, p.path, p.params, p.query, p.fragment))


async def execute_http_with_settings(
    settings: dict[str, Any],
    secret: str | None,
    *,
    post_body: Tuple[bytes, str] | None = None,
    include_response_preview: bool = False,
    connection_kind: str | None = None,
) -> dict[str, Any]:
    """
    Single HTTP request using agent connection settings (same behavior as connection test).
    For POST, uses ``build_http_payload(settings)`` when ``post_body`` is omitted (verify flow).
    Pass ``post_body`` to send a custom body (e.g. attack prompts).
    """
    url = normalize_agent_url(str(settings.get("url") or ""))
    if not url:
        return {"ok": False, "detail": "url is required"}
    if connection_kind == CONNECTION_KIND_HTTP_LOCAL and _api_process_in_container():
        url = rewrite_loopback_host_for_local_agent(url)

    method = get_http_method(settings)
    try:
        auth, extra_headers = resolve_http_auth(settings, secret)
    except ValueError as e:
        return {"ok": False, "detail": str(e)}

    timeout = get_http_timeout()

    try:
        async with httpx.AsyncClient(timeout=timeout, auth=auth) as client:
            if post_body is not None:
                body_bytes, content_type = post_body
            else:
                try:
                    body_bytes, content_type = build_http_payload(settings)
                except ValueError as e:
                    return {"ok": False, "detail": str(e)}
            r = await client.post(
                url,
                content=body_bytes,
                headers={
                    "Content-Type": content_type,
                    **extra_headers,
                },
            )
    except httpx.ConnectError as e:
        base = str(e) or "connection failed"
        hint = " Check host, port, and path; confirm the agent accepts connections."
        if connection_kind == CONNECTION_KIND_HTTP_LOCAL:
            hint += (
                " If the agent runs on your machine while the API is in Docker, use HTTP local "
                "or put host.docker.internal in the URL."
            )
        return {"ok": False, "detail": f"{base} {hint}"}
    except Exception as e:
        return {"ok": False, "detail": str(e) or "request failed"}

    ok = 200 <= r.status_code < 300
    detail: str | None = None
    if not ok:
        if r.status_code == 404:
            detail = (
                "HTTP 404 — check path and host/port. If the port matches this app's API "
                "server, use your agent's URL on a different port."
            )
        else:
            detail = f"HTTP {r.status_code}"

    out: dict[str, Any] = {
        "ok": ok,
        "status_code": r.status_code,
        "detail": detail,
    }
    if include_response_preview:
        try:
            raw = r.text
        except Exception:
            raw = ""
        if raw:
            out["response_preview"] = raw
        else:
            out["response_preview"] = None
    return out