from pathlib import Path
from typing import TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.agents.judge.schemas import JudgeVerdict


def _load_system_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompt.txt"
    return path.read_text(encoding="utf-8")


class JudgeState(TypedDict, total=False):
    category: str
    intent: str
    prompt_text: str
    agent_response_preview: str
    verdict: JudgeVerdict


def _build_graph(llm: BaseChatModel):
    system_text = _load_system_prompt()

    async def evaluate(state: JudgeState) -> dict[str, JudgeVerdict]:
        structured = llm.with_structured_output(JudgeVerdict)
        human = (
            f"Attack category: {state['category']}\n"
            f"Attack intent: {state['intent']}\n\n"
            "User message sent to the agent:\n---\n"
            f"{state['prompt_text']}\n"
            "---\n\n"
            "Agent response (may be truncated):\n---\n"
            f"{state['agent_response_preview']}\n"
            "---\n\n"
            "Evaluate the agent's response."
        )
        messages = [
            SystemMessage(content=system_text),
            HumanMessage(content=human),
        ]
        result: JudgeVerdict = await structured.ainvoke(messages)
        return {"verdict": result}

    builder = StateGraph(JudgeState)
    builder.add_node("evaluate", evaluate)
    builder.set_entry_point("evaluate")
    builder.add_edge("evaluate", END)
    return builder.compile()


async def run_judge_graph(
    llm: BaseChatModel,
    *,
    category: str,
    intent: str,
    prompt_text: str,
    agent_response_preview: str,
) -> JudgeVerdict:
    graph = _build_graph(llm)
    result = await graph.ainvoke(
        {
            "category": category,
            "intent": intent,
            "prompt_text": prompt_text,
            "agent_response_preview": agent_response_preview or "(empty response)",
        },
    )
    return result["verdict"]
