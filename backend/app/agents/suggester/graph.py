from pathlib import Path

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.suggester.schemas import HardeningSuggestions


def _load_system_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompt.txt"
    return path.read_text(encoding="utf-8")


async def run_suggester_graph(
    llm: BaseChatModel,
    *,
    judge_constraint_summary: dict[str, str],
    response_preview: str,
) -> str:
    structured = llm.with_structured_output(HardeningSuggestions)
    system_text = _load_system_prompt()
    summary_text = (
        "Validation goal:\n"
        f"{str(judge_constraint_summary.get('validation_goal', '')).strip() or '(not provided)'}\n\n"
        "Expected constraints:\n"
        f"{str(judge_constraint_summary.get('expected_constraints', '')).strip() or '(not provided)'}\n\n"
        "Failure evidence:\n"
        f"{str(judge_constraint_summary.get('failure_evidence', '')).strip() or '(not provided)'}"
    )
    clipped_response = (response_preview or "").strip()
    if len(clipped_response) > 7000:
        clipped_response = f"{clipped_response[:7000]}\n\n[truncated]"
    result: HardeningSuggestions = await structured.ainvoke(
        [
            SystemMessage(content=system_text),
            HumanMessage(
                content=(
                    "Constraint summary from judge step 1:\n---\n"
                    f"{summary_text}\n---\n\n"
                    "Agent response marked as vulnerable:\n---\n"
                    f"{clipped_response or '(empty response)'}\n---\n\n"
                    "Generate short hardening suggestions."
                ),
            ),
        ],
    )
    return result.suggestions.strip() or "No suggestions generated."
