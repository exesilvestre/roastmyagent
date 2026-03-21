import json

from app.models.evaluation_session import EvaluationSession
from app.services.agent_connection_service.agent_connection_service import AgentConnectionService


def build_attacker_context(session: EvaluationSession) -> str:
    parts: list[str] = []
    if session.agent_description:
        parts.append(f"Agent description:\n{session.agent_description}")
    if session.agent_connection:
        pub = AgentConnectionService.to_public(session.agent_connection)
        parts.append(f"Connection kind: {pub.connection_kind}")
        parts.append(
            "Connection settings (non-secret): "
            + json.dumps(pub.settings, ensure_ascii=False),
        )
    if not parts:
        return "(No agent description or connection metadata; use generic diverse probes.)"
    return "\n\n".join(parts)
