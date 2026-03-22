import uuid
from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.evaluation_session import EvaluationSession


class SessionAttackTestRun(Base):
    __tablename__ = "session_attack_test_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluation_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delay_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    total_steps: Mapped[int] = mapped_column(Integer, nullable=False)
    ok_count: Mapped[int] = mapped_column(Integer, nullable=False)
    fail_count: Mapped[int] = mapped_column(Integer, nullable=False)
    events: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    session: Mapped["EvaluationSession"] = relationship(
        "EvaluationSession",
        back_populates="attack_test_runs",
    )
