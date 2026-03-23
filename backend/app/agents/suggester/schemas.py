from pydantic import BaseModel, Field


class HardeningSuggestions(BaseModel):
    suggestions: str = Field(
        description=(
            "Short actionable mitigation list for a vulnerable test case. "
            "Focus on system prompt constraints and technical guardrails."
        ),
    )
