import pytest
from core_logic import (
    decide_action,
    calculate_confidence_score,
    verify_translation_integrity,
    evaluate_stop_rule,
    detect_dispute_or_utr,
    detect_root_cause_from_gateway
)
from graph_agent import run_recovery_pipeline

def test_gateway_error_code_detection_mapped():
    reason, cat, desc = detect_root_cause_from_gateway("GATEWAY_ERROR_DEBIT_FAILED")
    assert reason == "insufficient_funds"
    assert "Mandate Balance" in cat

def test_gateway_error_code_detection_unmapped():
    reason, cat, desc = detect_root_cause_from_gateway("CORRUPT_BUFFER_FAULT")
    assert reason == "unknown_anomaly"
    assert "Unmapped Gateway Event" in cat

def test_high_ticket_hitl_threshold_high():
    res_high = decide_action("network_error", amount=28000)
    assert res_high["requires_hitl"] is True

def test_high_ticket_hitl_threshold_low():
    res_low = decide_action("network_error", amount=1499)
    assert res_low["requires_hitl"] is False

def test_quiet_hours_daytime():
    day_res = decide_action("network_error", amount=999, simulated_hour=14)
    assert day_res["is_quiet_window"] is False
    assert "Immediate" in day_res["dispatch_timing"]

def test_quiet_hours_nighttime():
    night_res = decide_action("network_error", amount=999, simulated_hour=22)
    assert night_res["is_quiet_window"] is True
    assert "09:00 AM" in night_res["dispatch_timing"]

def test_insufficient_funds_ladder_stages():
    a1 = decide_action("insufficient_funds", amount=999, attempt_number=1)
    assert "Stage 1" in a1["action"]
    assert a1["bounce_fee_saved"] == 50.0

    a2 = decide_action("insufficient_funds", amount=999, attempt_number=2)
    assert "Stage 2" in a2["action"]

    a3 = decide_action("insufficient_funds", amount=999, attempt_number=3)
    assert "Stage 3" in a3["action"]
    assert a3["requires_hitl"] is True

def test_expired_card_ladder_stages():
    a1 = decide_action("expired_card", amount=1499, attempt_number=1)
    assert "Stage 1: Instant Card Details" in a1["action"]

    a2 = decide_action("expired_card", amount=1499, attempt_number=2)
    assert "Stage 2" in a2["action"]
    assert a2["requires_hitl"] is True

def test_b2b_aging_ladder_tiers():
    t1 = decide_action("b2b_overdue", amount=12000, days_overdue=2)
    assert "Tier 1" in t1["action"]

    t2 = decide_action("b2b_overdue", amount=12000, days_overdue=6)
    assert "Tier 2" in t2["action"]
    assert t2["split_tranches"] == 2

    t3 = decide_action("b2b_overdue", amount=12000, days_overdue=16)
    assert "Tier 3" in t3["action"]
    assert t3["requires_hitl"] is True

def test_anti_gaming_discount_guard():
    d1 = decide_action("checkout_abandoned", amount=1500, gross_margin=0.45, abandonment_count_30d=2)
    assert d1["discount_pct"] == 0.0

    d2 = decide_action("checkout_abandoned", amount=1500, gross_margin=0.45, abandonment_count_30d=0)
    assert d2["discount_pct"] == 5.0

    d3 = decide_action("checkout_abandoned", amount=1500, gross_margin=0.20, abandonment_count_30d=0)
    assert d3["discount_pct"] == 0.0

def test_numeric_regex_guardrail():
    orig = "Please pay Rs. 1499 via [PAYMENT_LINK]"
    valid = "Kripya 1,499 rupaye is link par pay karein: [PAYMENT_LINK]"
    assert verify_translation_integrity(orig, valid, 1499.0) == valid

    bad = "Kripya 999 rupaye is link par pay karein: [PAYMENT_LINK]"
    assert verify_translation_integrity(orig, bad, 1499.0) == orig

def test_compliance_and_utr():
    assert evaluate_stop_rule("band karo please")[0] is True
    assert evaluate_stop_rule("kal pay karunga")[0] is False

    utr_res = detect_dispute_or_utr("Payment done UTR: 428901829102")
    assert utr_res["is_dispute"] is True
    assert utr_res["utr_number"] == "428901829102"

def test_langgraph_localization_dispatch():
    mock_txn = {
        "transaction_id": "TXN_TEST_01",
        "name": "Priya Nair",
        "amount": 1499.0,
        "raw_gateway_error": "BAD_REQUEST_PAYMENT_TIMED_OUT",
        "phone": "9876543210",
        "gross_margin": 0.40,
        "abandonment_count_30d": 0,
        "attempt_number": 1,
        "days_overdue": 0
    }
    out = run_recovery_pipeline(mock_txn, target_lang="Hinglish", simulated_hour=14)
    assert out["status"] == "Ready for Dispatch"
    assert "https://" in out["final_message"]
    assert "http" not in out["spoken_message"]
    assert "diye gaye link par" in out["spoken_message"]

def test_langgraph_quiet_hours_branch():
    mock_txn = {
        "transaction_id": "TXN_TEST_02",
        "name": "Rahul Verma",
        "amount": 1499.0,
        "raw_gateway_error": "GATEWAY_ERROR_DEBIT_FAILED",
        "phone": "9876543210",
        "gross_margin": 0.40,
        "abandonment_count_30d": 0,
        "attempt_number": 1,
        "days_overdue": 0
    }
    out = run_recovery_pipeline(mock_txn, target_lang="Hinglish", simulated_hour=23)
    assert "Queued" in out["status"]
    assert out["is_quiet_window"] is True

def test_langgraph_suppression_branch():
    mock_txn = {
        "transaction_id": "TXN_TEST_03",
        "name": "Sneha Iyer",
        "amount": 1499.0,
        "raw_gateway_error": "MANDATE_TOKEN_EXPIRED",
        "phone": "9876543210",
        "gross_margin": 0.40,
        "abandonment_count_30d": 0,
        "attempt_number": 1,
        "days_overdue": 0
    }
    out = run_recovery_pipeline(mock_txn, target_lang="Hinglish", is_suppressed=True)
    assert "Suppressed" in out["status"]

def test_langgraph_hitl_gate_branch():
    mock_txn_high_ticket = {
        "transaction_id": "TXN_TEST_04",
        "name": "Arjun Kapoor",
        "amount": 28000.0,
        "raw_gateway_error": "INVOICE_AGING_NET30_OVERDUE",
        "phone": "9876543210",
        "gross_margin": 0.50,
        "abandonment_count_30d": 0,
        "attempt_number": 1,
        "days_overdue": 5
    }
    out = run_recovery_pipeline(mock_txn_high_ticket, target_lang="Hinglish", simulated_hour=14)
    assert "Awaiting" in out["status"]
    assert out["requires_hitl"] is True
    assert out["confidence"] == 50