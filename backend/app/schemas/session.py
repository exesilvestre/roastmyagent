from datetime import datetime
from typing import Literal

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.schemas.agent_connection import AgentConnectionCreate, AgentConnectionPublic


class SessionCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str = Field(min_length=1, max_length=512)
    agent_description: str | None = Field(default=None, max_length=8000)
    agent_connection: AgentConnectionCreate | None = None


class SessionUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=512)
    agent_description: str | None = Field(default=None, max_length=8000)
    status: Literal["COMPLETED", "RUNNING", "DRAFT"] | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    title: str
    agent_description: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    agent_connection: AgentConnectionPublic | None = None
