from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from ..services.core_logic import (
    decide_action, 
    calculate_confidence_score, 
    verify_translation_integrity,
    detect_root_cause_from_gateway
)
from ..services.ai_messenger import generate_ai_recovery_message
from ..services.language_utils import translate_message
from ..services.razorpay_utils import create_razorpay_payment_link

class RecoveryState(TypedDict):
    transaction_id: str
    name: str
    amount: float
    effective_amount: float
    gross_margin: float
    abandonment_count_30d: int
    attempt_number: int
    days_overdue: int
    raw_gateway_error: str
    failure_reason: str
    failure_category: str
    failure_description: str
    phone: str
    target_language: str
    simulated_hour: int | None
    decision: dict
    confidence: int
    base_message: str
    final_message: str
    spoken_message: str
    retry_url: str
    is_suppressed: bool
    is_quiet_window: bool
    force_dispatch: bool
    force_approve: bool
    requires_hitl: bool
    status: str

def triage_node(state: RecoveryState) -> dict:
    raw_code = state.get("raw_gateway_error", "")
    if raw_code:
        inferred_reason, category, desc = detect_root_cause_from_gateway(raw_code)
    else:
        inferred_reason = state.get("failure_reason", "unknown_anomaly")
        category = "Direct Ingestion"
        desc = "Direct failure reason provided"

    decision = decide_action(
        failure_reason=inferred_reason,
        amount=state["amount"],
        gross_margin=state.get("gross_margin", 0.40),
        abandonment_count_30d=state.get("abandonment_count_30d", 0),
        days_overdue=state.get("days_overdue", 0),
        attempt_number=state.get("attempt_number", 1),
        simulated_hour=state.get("simulated_hour")
    )
    confidence = calculate_confidence_score(
        failure_reason=inferred_reason,
        amount=state["amount"],
        abandonment_count_30d=state.get("abandonment_count_30d", 0),
        days_overdue=state.get("days_overdue", 0),
        attempt_number=state.get("attempt_number", 1)
    )
    
    effective_amount = state["amount"]
    if decision.get("discount_pct", 0.0) > 0:
        effective_amount = effective_amount * (1.0 - decision["discount_pct"] / 100.0)
    elif decision.get("split_tranches", 1) == 2:
        effective_amount = effective_amount / 2.0

    requires_hitl = False
    if not state.get("force_approve", False):
        if decision.get("requires_hitl", False) or confidence < 30:
            requires_hitl = True

    return {
        "failure_reason": inferred_reason,
        "failure_category": category,
        "failure_description": desc,
        "decision": decision, 
        "confidence": confidence,
        "effective_amount": round(effective_amount, 2),
        "is_quiet_window": decision.get("is_quiet_window", False),
        "requires_hitl": requires_hitl
    }

def synthesis_node(state: RecoveryState) -> dict:
    base_msg = generate_ai_recovery_message(
        state["name"], state["effective_amount"], state["failure_reason"],
        state["decision"]["action"], state["decision"]["explanation"]
    )
    return {"base_message": base_msg}

def localization_node(state: RecoveryState) -> dict:
    translated = translate_message(state["base_message"], state["target_language"])
    retry_url = create_razorpay_payment_link(state["effective_amount"], state["name"], state["phone"], state["transaction_id"])
    
    verified_msg = verify_translation_integrity(state["base_message"], translated, state["effective_amount"])
    final_msg = verified_msg.replace("[PAYMENT_LINK]", retry_url)
    spoken_msg = verified_msg.replace("[PAYMENT_LINK]", "diye gaye link par").replace("http", "").strip()
    
    return {
        "final_message": final_msg, 
        "spoken_message": spoken_msg,
        "retry_url": retry_url, 
        "status": "Ready for Dispatch"
    }

def quiet_hours_gate_node(state: RecoveryState) -> dict:
    return {"status": "Queued (Outside Contact Hours - Rescheduled for 09:00 AM)"}

def hitl_gate_node(state: RecoveryState) -> dict:
    return {"status": "Awaiting Merchant Approval (High Ticket / Escalation Required)"}

def suppression_node(state: RecoveryState) -> dict:
    return {"status": "Suppressed (Customer in Opt-Out Registry)"}

def route_after_triage(state: RecoveryState) -> Literal["suppression", "quiet_hours_gate", "hitl_gate", "synthesis"]:
    if state.get("is_suppressed", False):
        return "suppression"
    if state.get("is_quiet_window", False) and not state.get("force_dispatch", False):
        return "quiet_hours_gate"
    if state.get("requires_hitl", False) and not state.get("force_approve", False):
        return "hitl_gate"
    return "synthesis"

workflow = StateGraph(RecoveryState)
workflow.add_node("triage", triage_node)
workflow.add_node("synthesis", synthesis_node)
workflow.add_node("localization", localization_node)
workflow.add_node("quiet_hours_gate", quiet_hours_gate_node)
workflow.add_node("hitl_gate", hitl_gate_node)
workflow.add_node("suppression", suppression_node)

workflow.add_edge(START, "triage")
workflow.add_conditional_edges("triage", route_after_triage)
workflow.add_edge("synthesis", "localization")
workflow.add_edge("localization", END)
workflow.add_edge("quiet_hours_gate", END)
workflow.add_edge("hitl_gate", END)
workflow.add_edge("suppression", END)

compiled_recovery_graph = workflow.compile()

def run_recovery_pipeline(
    txn_dict: dict, 
    target_lang: str, 
    is_suppressed: bool = False,
    force_dispatch: bool = False,
    force_approve: bool = False,
    simulated_hour: int | None = None
) -> dict:
    initial_state: RecoveryState = {
        "transaction_id": str(txn_dict["transaction_id"]),
        "name": str(txn_dict["name"]),
        "amount": float(txn_dict["amount"]),
        "effective_amount": float(txn_dict["amount"]),
        "gross_margin": float(txn_dict.get("gross_margin", 0.40)),
        "abandonment_count_30d": int(txn_dict.get("abandonment_count_30d", 0)),
        "attempt_number": int(txn_dict.get("attempt_number", 1)),
        "days_overdue": int(txn_dict.get("days_overdue", 0)),
        "raw_gateway_error": str(txn_dict.get("raw_gateway_error", "")),
        "failure_reason": str(txn_dict.get("failure_reason", "")),
        "failure_category": "",
        "failure_description": "",
        "phone": str(txn_dict["phone"]),
        "target_language": target_lang,
        "simulated_hour": simulated_hour,
        "decision": {},
        "confidence": 0,
        "base_message": "",
        "final_message": "",
        "spoken_message": "",
        "retry_url": "",
        "is_suppressed": is_suppressed,
        "is_quiet_window": False,
        "force_dispatch": force_dispatch,
        "force_approve": force_approve,
        "requires_hitl": False,
        "status": "Pending"
    }
    return compiled_recovery_graph.invoke(initial_state)