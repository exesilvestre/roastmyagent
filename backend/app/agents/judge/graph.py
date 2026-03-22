from pathlib import Path
from typing import TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel

from app.agents.judge.schemas import JudgeVerdict, ProbeConstraintSummary


def _load_prompt(name: str) -> str:
    path = Path(__file__).resolve().parent / name
    return path.read_text(encoding="utf-8")


class JudgeRunResult(BaseModel):
    verdict: JudgeVerdict
    constraint_summary: ProbeConstraintSummary


class JudgeState(TypedDict, total=False):
    context_text: str
    category: str
    intent: str
    prompt_text: str
    agent_response: str
    constraint_summary: dict[str, str]
    verdict: JudgeVerdict


def format_constraint_brief(summary: ProbeConstraintSummary) -> str:
    return (
        f"Validation goal:\n{summary.validation_goal}\n\n"
        f"Expected constraints:\n{summary.expected_constraints}\n\n"
        f"Failure evidence (for this probe):\n{summary.failure_evidence}"
    )


def _build_graph(llm: BaseChatModel):
    constraint_system = _load_prompt("constraint_summary_prompt.txt")
    judge_system = _load_prompt("prompt.txt")

    async def summarize_constraints(state: JudgeState) -> dict[str, dict[str, str]]:
        structured = llm.with_structured_output(ProbeConstraintSummary)
        human = (
            "TARGET CONTEXT:\n---\n"
            f"{state['context_text']}\n"
            "---\n\n"
            f"Attack category: {state['category']}\n"
            f"Attack intent: {state['intent']}\n\n"
            "User message sent to the agent:\n---\n"
            f"{state['prompt_text']}\n"
            "---\n\n"
            "Summarize the validation goal and constraints for this probe."
        )
        messages = [
            SystemMessage(content=constraint_system),
            HumanMessage(content=human),
        ]
        result: ProbeConstraintSummary = await structured.ainvoke(messages)
        return {"constraint_summary": result.model_dump()}

    async def evaluate(state: JudgeState) -> dict[str, JudgeVerdict]:
        structured = llm.with_structured_output(JudgeVerdict)
        summary = ProbeConstraintSummary(**state["constraint_summary"])
        brief = format_constraint_brief(summary)
        human = (
            f"{brief}\n\n"
            f"Attack category: {state['category']}\n"
            f"Attack intent: {state['intent']}\n\n"
            "User message sent to the agent:\n---\n"
            f"{state['prompt_text']}\n"
            "---\n\n"
            "Agent response (full HTTP body text):\n---\n"
            f"{state['agent_response']}\n"
            "---\n\n"
            "Evaluate the agent's response against the constraint brief."
        )
        messages = [
            SystemMessage(content=judge_system),
            HumanMessage(content=human),
        ]
        result: JudgeVerdict = await structured.ainvoke(messages)
        return {"verdict": result}

    builder = StateGraph(JudgeState)
    builder.add_node("summarize_constraints", summarize_constraints)
    builder.add_node("evaluate", evaluate)
    builder.set_entry_point("summarize_constraints")
    builder.add_edge("summarize_constraints", "evaluate")
    builder.add_edge("evaluate", END)
    return builder.compile()


async def run_judge_graph(
    llm: BaseChatModel,
    *,
    context_text: str,
    category: str,
    intent: str,
    prompt_text: str,
    agent_response: str,
) -> JudgeRunResult:
    graph = _build_graph(llm)
    text_in = (agent_response or "").strip() or "(empty response)"
    result = await graph.ainvoke(
        {
            "context_text": context_text or "(no agent context provided)",
            "category": category,
            "intent": intent,
            "prompt_text": prompt_text,
            "agent_response": text_in,
        },
    )
    cs = result.get("constraint_summary")
    if not isinstance(cs, dict):
        raise RuntimeError("judge graph missing constraint_summary")
    constraint_summary = ProbeConstraintSummary(**cs)
    v = result.get("verdict")
    if isinstance(v, dict):
        verdict = JudgeVerdict(**v)
    elif isinstance(v, JudgeVerdict):
        verdict = v
    else:
        raise RuntimeError("judge graph missing verdict")
    return JudgeRunResult(
        verdict=verdict,
        constraint_summary=constraint_summary,
    )
