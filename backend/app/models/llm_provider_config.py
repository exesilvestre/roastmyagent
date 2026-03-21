from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LlmProviderConfig(Base):
    __tablename__ = "llm_provider_configs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    encrypted_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    active_provider_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("llm_provider_configs.id", ondelete="SET NULL"),
        nullable=True,
    )
