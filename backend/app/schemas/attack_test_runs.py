from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AttackTestRunListItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    created_at: datetime
    delay_seconds: int
    total_steps: int
    ok_count: int
    fail_count: int


class AttackTestRunDetailOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    created_at: datetime
    delay_seconds: int
    total_steps: int
    ok_count: int
    fail_count: int
    events: list[dict[str, Any]]
