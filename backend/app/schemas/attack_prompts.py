import uuid
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.agents.attacker.schemas import MaliciousPromptItem
from app.models.session_attack_prompt import SessionAttackPrompt


class AttackPromptDraft(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    category: str = ""
    intent: str = ""
    prompt_text: str = ""


class AttackPromptsSaveRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompts: list[AttackPromptDraft]


class AttackPromptRowOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    category: str
    intent: str
    prompt_text: str


class AttackPromptsListResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompts: list[AttackPromptRowOut]


class AttackTestRunRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompt_ids: list[UUID]
    delay_seconds: Literal[5, 10, 20]
    agent_timeout_seconds: int | None = Field(default=20, ge=1, le=600)


class AttackTestStepResult(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompt_id: UUID
    category: str | None = None
    intent: str | None = None
    ok: bool
    status_code: int | None = None
    detail: str | None = None
    response_preview: str | None = None
    judge_score: int | None = None
    judge_verdict: str | None = None
    judge_reasoning: str | None = None
    judge_failed: bool | None = None
    judge_error: str | None = None
    judge_constraint_summary: dict[str, str] | None = None


class AttackTestRunResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    steps: list[AttackTestStepResult]

class AttackTestSuggestionsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    suggestions: str


def rows_to_list_response(rows: list[SessionAttackPrompt]) -> AttackPromptsListResponse:
    return AttackPromptsListResponse(
        prompts=[
            AttackPromptRowOut(
                id=r.id,
                category=r.category,
                intent=r.intent,
                prompt_text=r.prompt_text,
            )
            for r in rows
        ],
    )


def malicious_items_to_preview_response(items: list[MaliciousPromptItem]) -> AttackPromptsListResponse:
    """LLM output for the client only; assigns fresh UUIDs per row (not persisted until PUT)."""
    return AttackPromptsListResponse(
        prompts=[
            AttackPromptRowOut(
                id=uuid.uuid4(),
                category=i.category,
                intent=i.intent,
                prompt_text=i.prompt_text,
            )
            for i in items
        ],
    )
