from typing import TypedDict, Literal

from langgraph.graph import (
    StateGraph,
    START,
    END,
)

from ..services.core_logic import (
    decide_action,
    calculate_confidence_score,
    verify_translation_integrity,
    detect_root_cause_from_gateway,
)

from ..services.ai_messenger import (
    generate_ai_recovery_message,
)

from ..services.language_utils import (
    translate_message,
)

from ..services.razorpay_utils import (
    create_razorpay_payment_link,
)


# ============================================================
# RECOVERY STATE
# ============================================================

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


# ============================================================
# 1. TRIAGE / DIAGNOSIS
# ============================================================

def triage_node(state: RecoveryState) -> dict:
    raw_code = state.get(
        "raw_gateway_error",
        "",
    )

    if raw_code:
        (
            inferred_reason,
            category,
            description,
        ) = detect_root_cause_from_gateway(
            raw_code
        )
    else:
        inferred_reason = state.get(
            "failure_reason",
            "unknown_anomaly",
        )

        category = "Direct Ingestion"

        description = (
            "Direct failure reason provided"
        )

    decision = decide_action(
        failure_reason=inferred_reason,
        amount=state["amount"],
        gross_margin=state.get(
            "gross_margin",
            0.40,
        ),
        abandonment_count_30d=state.get(
            "abandonment_count_30d",
            0,
        ),
        days_overdue=state.get(
            "days_overdue",
            0,
        ),
        attempt_number=state.get(
            "attempt_number",
            1,
        ),
        simulated_hour=state.get(
            "simulated_hour"
        ),
    )

    confidence = calculate_confidence_score(
        failure_reason=inferred_reason,
        amount=state["amount"],
        abandonment_count_30d=state.get(
            "abandonment_count_30d",
            0,
        ),
        days_overdue=state.get(
            "days_overdue",
            0,
        ),
        attempt_number=state.get(
            "attempt_number",
            1,
        ),
    )

    # ========================================================
    # EFFECTIVE AMOUNT
    # ========================================================

    effective_amount = state["amount"]

    discount_pct = decision.get(
        "discount_pct",
        0.0,
    )

    split_tranches = decision.get(
        "split_tranches",
        1,
    )

    if discount_pct > 0:
        effective_amount = (
            effective_amount
            * (
                1.0
                - discount_pct / 100.0
            )
        )

    elif split_tranches == 2:
        effective_amount = (
            effective_amount / 2.0
        )

    # ========================================================
    # HITL
    # ========================================================

    requires_hitl = False

    if not state.get(
        "force_approve",
        False,
    ):
        if (
            decision.get(
                "requires_hitl",
                False,
            )
            or confidence < 30
        ):
            requires_hitl = True

    return {
        "failure_reason": inferred_reason,
        "failure_category": category,
        "failure_description": description,
        "decision": decision,
        "confidence": confidence,
        "effective_amount": round(
            effective_amount,
            2,
        ),
        "is_quiet_window": decision.get(
            "is_quiet_window",
            False,
        ),
        "requires_hitl": requires_hitl,
    }


# ============================================================
# 2. CUSTOMER MESSAGE GENERATION
# ============================================================

def synthesis_node(
    state: RecoveryState,
) -> dict:

    base_message = generate_ai_recovery_message(
        state["name"],
        state["effective_amount"],
        state["failure_reason"],
        state["decision"]["action"],
        state["decision"]["explanation"],
    )

    return {
        "base_message": base_message
    }


# ============================================================
# 3. LOCALIZATION + PAYMENT LINK
#
# IMPORTANT:
# This generates a PREVIEW even when a workflow is queued
# or awaiting approval.
#
# It does NOT mean the message is automatically dispatched.
# ============================================================

def localization_node(
    state: RecoveryState,
) -> dict:

    translated = translate_message(
        state["base_message"],
        state["target_language"],
    )

    retry_url = create_razorpay_payment_link(
        state["effective_amount"],
        state["name"],
        state["phone"],
        state["transaction_id"],
    )

    verified_message = (
        verify_translation_integrity(
            state["base_message"],
            translated,
            state["effective_amount"],
        )
    )

    final_message = verified_message.replace(
        "[PAYMENT_LINK]",
        retry_url,
    )

    spoken_message = (
        verified_message
        .replace(
            "[PAYMENT_LINK]",
            "diye gaye payment link par",
        )
        .replace(
            "http",
            "",
        )
        .strip()
    )

    return {
        "final_message": final_message,
        "spoken_message": spoken_message,
        "retry_url": retry_url,
    }


# ============================================================
# 4. FINAL SAFETY / DISPATCH STATE
# ============================================================

def final_gate_node(
    state: RecoveryState,
) -> dict:

    # --------------------------------------------------------
    # SUPPRESSION
    # --------------------------------------------------------

    if state.get(
        "is_suppressed",
        False,
    ):
        return {
            "status": (
                "Suppressed "
                "(Customer in Opt-Out Registry)"
            )
        }

    # --------------------------------------------------------
    # QUIET HOURS
    #
    # Message and QR can exist as PREVIEW,
    # but dispatch remains blocked.
    # --------------------------------------------------------

    if (
        state.get(
            "is_quiet_window",
            False,
        )
        and not state.get(
            "force_dispatch",
            False,
        )
    ):
        return {
            "status": (
                "Queued "
                "(Outside Contact Hours - "
                "Rescheduled for 09:00 AM)"
            )
        }

    # --------------------------------------------------------
    # HITL
    #
    # Message and QR can exist as PREVIEW,
    # but dispatch remains blocked until approval.
    # --------------------------------------------------------

    if (
        state.get(
            "requires_hitl",
            False,
        )
        and not state.get(
            "force_approve",
            False,
        )
    ):
        return {
            "status": (
                "Awaiting Merchant Approval "
                "(High Ticket / Escalation Required)"
            )
        }

    # --------------------------------------------------------
    # READY
    # --------------------------------------------------------

    return {
        "status": "Ready for Dispatch"
    }


# ============================================================
# GRAPH
# ============================================================

workflow = StateGraph(
    RecoveryState
)

workflow.add_node(
    "triage",
    triage_node,
)

workflow.add_node(
    "synthesis",
    synthesis_node,
)

workflow.add_node(
    "localization",
    localization_node,
)

workflow.add_node(
    "final_gate",
    final_gate_node,
)

# Suppression is the only condition that should
# prevent customer communication preview generation.
#
# All other workflows continue through:
#
# Triage
#   ↓
# Synthesis
#   ↓
# Localization
#   ↓
# Final safety gate
#
workflow.add_node(
    "suppression",
    lambda state: {
        "status": (
            "Suppressed "
            "(Customer in Opt-Out Registry)"
        )
    },
)

workflow.add_edge(
    START,
    "triage",
)


def route_after_triage(
    state: RecoveryState,
) -> Literal[
    "suppression",
    "synthesis",
]:

    if state.get(
        "is_suppressed",
        False,
    ):
        return "suppression"

    return "synthesis"


workflow.add_conditional_edges(
    "triage",
    route_after_triage,
)

workflow.add_edge(
    "synthesis",
    "localization",
)

workflow.add_edge(
    "localization",
    "final_gate",
)

workflow.add_edge(
    "final_gate",
    END,
)

workflow.add_edge(
    "suppression",
    END,
)


compiled_recovery_graph = (
    workflow.compile()
)


# ============================================================
# PUBLIC PIPELINE FUNCTION
# ============================================================

def run_recovery_pipeline(
    txn_dict: dict,
    target_lang: str,
    is_suppressed: bool = False,
    force_dispatch: bool = False,
    force_approve: bool = False,
    simulated_hour: int | None = None,
) -> dict:

    initial_state: RecoveryState = {
        "transaction_id": str(
            txn_dict["transaction_id"]
        ),

        "name": str(
            txn_dict["name"]
        ),

        "amount": float(
            txn_dict["amount"]
        ),

        "effective_amount": float(
            txn_dict["amount"]
        ),

        "gross_margin": float(
            txn_dict.get(
                "gross_margin",
                0.40,
            )
        ),

        "abandonment_count_30d": int(
            txn_dict.get(
                "abandonment_count_30d",
                0,
            )
        ),

        "attempt_number": int(
            txn_dict.get(
                "attempt_number",
                1,
            )
        ),

        "days_overdue": int(
            txn_dict.get(
                "days_overdue",
                0,
            )
        ),

        "raw_gateway_error": str(
            txn_dict.get(
                "raw_gateway_error",
                "",
            )
        ),

        "failure_reason": str(
            txn_dict.get(
                "failure_reason",
                "",
            )
        ),

        "failure_category": "",
        "failure_description": "",

        "phone": str(
            txn_dict.get(
                "phone",
                "",
            )
        ),

        "target_language": (
            target_lang or "Hinglish"
        ),

        "simulated_hour": simulated_hour,

        "decision": {},
        "confidence": 0,

        "base_message": "",
        "final_message": "",
        "spoken_message": "",

        "retry_url": "",

        "is_suppressed": (
            is_suppressed
        ),

        "is_quiet_window": False,

        "force_dispatch": (
            force_dispatch
        ),

        "force_approve": (
            force_approve
        ),

        "requires_hitl": False,

        "status": "Pending",
    }

    return compiled_recovery_graph.invoke(
        initial_state
    )