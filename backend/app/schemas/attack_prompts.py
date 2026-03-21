import uuid
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.agents.attacker.schemas import MaliciousPromptItem
from app.models.session_attack_prompt import SessionAttackPrompt


class AttackPromptDraft(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    category: str = ""
    intent: str = ""
    prompt_text: str = ""
    rationale: str | None = None


class AttackPromptsSaveRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompts: list[AttackPromptDraft]


class AttackPromptRowOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    category: str
    intent: str
    prompt_text: str
    rationale: str | None = None


class AttackPromptsListResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompts: list[AttackPromptRowOut]


def rows_to_list_response(rows: list[SessionAttackPrompt]) -> AttackPromptsListResponse:
    return AttackPromptsListResponse(
        prompts=[
            AttackPromptRowOut(
                id=r.id,
                category=r.category,
                intent=r.intent,
                prompt_text=r.prompt_text,
                rationale=r.rationale,
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
                rationale=i.rationale,
            )
            for i in items
        ],
    )
