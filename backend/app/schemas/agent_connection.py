from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ConnectionKind = Literal["HTTP_LOCAL", "HTTP_REMOTE_BASIC"]


class AgentConnectionCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    connection_kind: ConnectionKind
    settings: dict[str, Any] = Field(default_factory=dict)
    secret: str | None = None


class AgentConnectionPublic(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    connection_kind: str
    settings: dict[str, Any]
    has_secret: bool


class AgentConnectionVerifyResult(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    ok: bool
    detail: str | None = None
    preview: str | None = None


class AgentConnectionVerifyBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    connection_kind: ConnectionKind
    settings: dict[str, Any] = Field(default_factory=dict)
    secret: str | None = None
