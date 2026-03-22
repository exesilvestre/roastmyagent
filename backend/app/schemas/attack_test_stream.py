"""SSE payloads for attack test progress (not LLM token streaming)."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class RunStartedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["run_started"] = "run_started"
    total_steps: int


class StepStartedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["step_started"] = "step_started"
    index: int
    prompt_id: UUID
    category: str
    intent: str


class AgentFinishedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["agent_finished"] = "agent_finished"
    index: int
    ok: bool
    status_code: int | None = None
    detail: str | None = None
    response_preview: str | None = None


class JudgeStartedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["judge_started"] = "judge_started"
    index: int


class JudgeFinishedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["judge_finished"] = "judge_finished"
    index: int
    score: int | None = None
    verdict: str | None = None
    reasoning: str | None = None
    failed: bool = False
    error: str | None = None
    constraint_summary: str | None = None


class RunFinishedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["run_finished"] = "run_finished"
    ok_count: int
    fail_count: int


class ErrorEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["error"] = "error"
    message: str


class RunSavedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    event: Literal["run_saved"] = "run_saved"
    run_id: UUID
