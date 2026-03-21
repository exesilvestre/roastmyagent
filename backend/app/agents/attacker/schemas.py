from pydantic import BaseModel, Field


class MaliciousPromptItem(BaseModel):
    """One synthetic adversarial user message for red-teaming (not executed automatically)."""

    category: str = Field(
        description="Attack family, e.g. prompt_injection, jailbreak, system_prompt_extraction, tool_abuse, encoding_obfuscation, role_play, data_exfiltration",
    )
    intent: str = Field(description="Short label for what this probe tries to surface.")
    prompt_text: str = Field(description="The exact user message to send to the target agent in a later step.")
    rationale: str | None = Field(
        default=None,
        description="Why this category matters for the described target.",
    )


class MaliciousPromptBatch(BaseModel):
    prompts: list[MaliciousPromptItem] = Field(
        min_length=10,
        max_length=10,
        description="Exactly ten diverse adversarial prompts.",
    )
