"""Mirror frontend foldAttackTestEvents for persisted SSE-shaped JSON."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FoldedTestRunState:
    total_steps: int = 0
    summary: dict[str, int] | None = None  
    by_index: dict[int, dict[str, Any]] = field(default_factory=dict)
    fatal_error: str | None = None


def fold_attack_test_events(events: list[dict[str, Any]]) -> FoldedTestRunState:
    state = FoldedTestRunState()
    for ev in events:
        kind = ev.get("event")
        if kind == "run_saved":
            continue
        if kind == "run_started":
            state.total_steps = int(ev.get("totalSteps") or ev.get("total_steps") or 0)
        elif kind == "step_started":
            idx = int(ev["index"])
            pid = ev.get("promptId") or ev.get("prompt_id")
            state.by_index[idx] = {
                **state.by_index.get(idx, {}),
                "index": idx,
                "promptId": str(pid) if pid is not None else None,
                "category": ev.get("category"),
                "intent": ev.get("intent"),
            }
        elif kind == "agent_finished":
            idx = int(ev["index"])
            state.by_index[idx] = {
                **state.by_index.get(idx, {}),
                "index": idx,
                "agent": {
                    "ok": bool(ev.get("ok")),
                    "statusCode": ev.get("statusCode") if ev.get("statusCode") is not None else ev.get("status_code"),
                    "detail": ev.get("detail"),
                    "responsePreview": ev.get("responsePreview") if ev.get("responsePreview") is not None else ev.get("response_preview"),
                },
            }
        elif kind == "judge_started":
            idx = int(ev["index"])
            state.by_index[idx] = {
                **state.by_index.get(idx, {}),
                "index": idx,
                "judgePending": True,
            }
        elif kind == "judge_finished":
            idx = int(ev["index"])
            state.by_index[idx] = {
                **state.by_index.get(idx, {}),
                "index": idx,
                "judgePending": False,
                "judge": {
                    "score": ev.get("score"),
                    "verdict": ev.get("verdict"),
                    "reasoning": ev.get("reasoning"),
                    "failed": bool(ev.get("failed", False)),
                    "error": ev.get("error"),
                    "constraintSummary": ev.get("constraintSummary")
                    if ev.get("constraintSummary") is not None
                    else ev.get("constraint_summary"),
                },
            }
        elif kind == "run_finished":
            ok = int(ev.get("okCount") or ev.get("ok_count") or 0)
            fail = int(ev.get("failCount") or ev.get("fail_count") or 0)
            state.summary = {"ok": ok, "fail": fail}
        elif kind == "error":
            state.fatal_error = str(ev.get("message") or "")
    return state
