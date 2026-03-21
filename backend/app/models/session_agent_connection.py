import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.evaluation_session import EvaluationSession


class SessionAgentConnection(Base):
    __tablename__ = "session_agent_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluation_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    connection_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    encrypted_secret: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped["EvaluationSession"] = relationship(
        "EvaluationSession",
        back_populates="agent_connection",
    )
