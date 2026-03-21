from pathlib import Path
from typing import TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.agents.attacker.schemas import MaliciousPromptBatch, MaliciousPromptItem


def _load_system_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompt.txt"
    return path.read_text(encoding="utf-8")


class AttackerState(TypedDict, total=False):
    context_text: str
    prompts: list[MaliciousPromptItem]


def _build_graph(llm: BaseChatModel):
    system_text = _load_system_prompt()

    async def generate(state: AttackerState) -> dict[str, list[MaliciousPromptItem]]:
        structured = llm.with_structured_output(MaliciousPromptBatch)
        messages = [
            SystemMessage(content=system_text),
            HumanMessage(
                content=(
                    "TARGET CONTEXT (use this to specialize the ten probes):\n\n"
                    f"{state['context_text']}"
                ),
            ),
        ]
        result: MaliciousPromptBatch = await structured.ainvoke(messages)
        return {"prompts": list(result.prompts)}

    builder = StateGraph(AttackerState)
    builder.add_node("generate", generate)
    builder.set_entry_point("generate")
    builder.add_edge("generate", END)
    return builder.compile()


async def run_attacker_graph(llm: BaseChatModel, *, context_text: str) -> list[MaliciousPromptItem]:
    graph = _build_graph(llm)
    result = await graph.ainvoke({"context_text": context_text})
    return result["prompts"]
