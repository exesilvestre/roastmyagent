from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.agents.attacker.schemas import MaliciousPromptItem


class MaliciousPromptItemOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    category: str
    intent: str
    prompt_text: str
    rationale: str | None = None


class AttackPromptsGenerateResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompts: list[MaliciousPromptItemOut]


def malicious_items_to_response(items: list[MaliciousPromptItem]) -> AttackPromptsGenerateResponse:
    return AttackPromptsGenerateResponse(
        prompts=[
            MaliciousPromptItemOut(
                category=i.category,
                intent=i.intent,
                prompt_text=i.prompt_text,
                rationale=i.rationale,
            )
            for i in items
        ],
    )
