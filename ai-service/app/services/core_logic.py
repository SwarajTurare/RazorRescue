import os
import re
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Official TRAI TCCCPR Restricted Commercial Window: 9:00 PM to 9:00 AM IST
QUIET_HOURS = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8]

RAW_GATEWAY_ERROR_MAP = {
    "BAD_REQUEST_PAYMENT_TIMED_OUT": {
        "reason": "network_error",
        "category": "Gateway Degradation",
        "description": "3DS OTP authorization timed out at issuer bank"
    },
    "GATEWAY_ERROR_DEBIT_FAILED": {
        "reason": "insufficient_funds",
        "category": "Mandate Balance",
        "description": "Customer account balance insufficient for auto-debit pull"
    },
    "MANDATE_TOKEN_EXPIRED": {
        "reason": "expired_card",
        "category": "Token Decay",
        "description": "Stored tokenized mandate reached expiry date"
    },
    "ORDER_CHECKOUT_ABANDONED": {
        "reason": "checkout_abandoned",
        "category": "Cart Friction",
        "description": "User initiated checkout session but exited before authorization"
    },
    "INVOICE_AGING_NET30_OVERDUE": {
        "reason": "b2b_overdue",
        "category": "Commercial Receivables",
        "description": "B2B enterprise invoice crossed agreed Net-30 credit terms"
    },
    "AUTH_OTP_DROPPED": {
        "reason": "auth_timeout",
        "category": "Authentication Failure",
        "description": "Issuer SMS OTP delivery delayed beyond 3DS session threshold"
    }
}

def detect_root_cause_from_gateway(raw_error_code: str) -> tuple[str, str, str]:
    mapped = RAW_GATEWAY_ERROR_MAP.get(raw_error_code, {
        "reason": "unknown_anomaly",
        "category": "Unmapped Gateway Event",
        "description": f"Unrecognized error code: {raw_error_code}"
    })
    return mapped["reason"], mapped["category"], mapped["description"]

def decide_action(
    failure_reason: str, 
    amount: float = 0.0,
    gross_margin: float = 0.40,
    abandonment_count_30d: int = 0,
    days_overdue: int = 0,
    attempt_number: int = 1,
    simulated_hour: int | None = None
) -> dict:
    current_hour = simulated_hour if simulated_hour is not None else datetime.now().hour
    is_quiet_window = current_hour in QUIET_HOURS
    dispatch_window = "Queued for 09:00 AM (TRAI 9 PM - 9 AM Restricted Window)" if is_quiet_window else "Immediate Dispatch"
    
    base_strategy = {
        "action": "Instant 1-Click Gateway Retry",
        "urgency": "Immediate (T+5m)",
        "discount_pct": 0.0,
        "split_tranches": 1,
        "bounce_fee_saved": 0.0,
        "requires_hitl": False,
        "is_quiet_window": is_quiet_window,
        "dispatch_timing": dispatch_window,
        "explanation": ""
    }

    if amount >= 25000:
        base_strategy["requires_hitl"] = True

    if failure_reason == "insufficient_funds":
        if attempt_number == 1:
            base_strategy.update({
                "action": "Stage 1: Silent Salary-Cycle Reschedule (T+1st)",
                "urgency": "Low (Zero Customer Disturbance)",
                "bounce_fee_saved": 50.0,
                "explanation": "Attempt 1: Auto-debit failed. Suppressed instant pull to save Rs. 50 bank penalty; scheduled for 1st of month."
            })
        elif attempt_number == 2:
            base_strategy.update({
                "action": "Stage 2: Self-Heal Mandate Interactive Portal Link",
                "urgency": "Medium (T+24h)",
                "explanation": "Attempt 2: Second debit failed. Dispatched gentle interactive portal for manual UPI/Card mandate update."
            })
        else:
            base_strategy.update({
                "action": "Stage 3: Subscription Pause Warning & Account Ops Escalation",
                "urgency": "Critical (Immediate)",
                "requires_hitl": True,
                "explanation": "Attempt 3: Terminal mandate degradation. Subscription queued for pause; routed to merchant approval."
            })
        return base_strategy

    if failure_reason == "expired_card":
        if attempt_number == 1:
            base_strategy.update({
                "action": "Stage 1: Instant Card Details Vault Update Link",
                "urgency": "Immediate (T+10m)",
                "explanation": "Attempt 1: Stored card expired. Route customer straight to tokenized vault update page."
            })
        else:
            base_strategy.update({
                "action": "Stage 2: Critical Vault Update Notice & Backup Mandate Request",
                "urgency": "Same-Day",
                "requires_hitl": True,
                "explanation": "Attempt 2: Stored mandate still invalid. Escalated to billing team."
            })
        return base_strategy

    if failure_reason == "b2b_overdue":
        if days_overdue <= 3:
            base_strategy.update({
                "action": f"Tier 1 (Aging: {days_overdue}d): Courtesy Statement & 1-Click Reconciliation",
                "urgency": "Standard",
                "explanation": f"Invoice is {days_overdue} days overdue. Dispatched polite ledger verification notice."
            })
        elif 4 <= days_overdue <= 8:
            base_strategy.update({
                "action": f"Tier 2 (Aging: {days_overdue}d): Net-15 Liquidity 50% Split Offer",
                "urgency": "Priority Escalation",
                "split_tranches": 2,
                "explanation": f"Invoice aging at {days_overdue} days. Offered 2-part installment plan to relieve liquidity block."
            })
        else:
            base_strategy.update({
                "action": f"Tier 3 (Aging: {days_overdue}d): Formal Commercial Demand & Credit Freeze Warning",
                "urgency": "Executive Escalation",
                "requires_hitl": True,
                "explanation": f"Severe invoice aging ({days_overdue}d). Dispatched legal notice & paused supply credit line."
            })
        return base_strategy

    if failure_reason == "checkout_abandoned":
        if abandonment_count_30d >= 2:
            base_strategy.update({
                "action": "Zero-Discount Cart Recovery Notice",
                "urgency": "T+2 hours",
                "explanation": f"Anti-Gaming Guard: {abandonment_count_30d} recent drops detected. Coupon harvesting suppressed."
            })
        elif gross_margin >= 0.35 and amount >= 1000:
            base_strategy.update({
                "action": "Margin-Backed 5% Nudge",
                "urgency": "T+1 hour",
                "discount_pct": 5.0,
                "explanation": f"Healthy unit economics ({int(gross_margin*100)}% margin). Bounded 5% incentive authorized."
            })
        else:
            base_strategy.update({
                "action": "Free Priority Shipping Nudge",
                "urgency": "T+1 hour",
                "explanation": "Low-margin item. Preserving merchant profitability by suppressing cash discounts."
            })
        return base_strategy

    if failure_reason in ["network_error", "auth_timeout"]:
        base_strategy.update({
            "action": "Instant 1-Click Gateway Re-auth",
            "urgency": "Immediate (T+5m)",
            "explanation": "Transient network timeout. Direct OTP completion link sent."
        })
        return base_strategy

    base_strategy.update({
        "action": f"Unmapped Error ({failure_reason}) - Routing to Ops",
        "urgency": "High",
        "explanation": f"Unrecognized failure reason '{failure_reason}'. Governed by confidence safety net."
    })
    return base_strategy

def calculate_confidence_score(
    failure_reason: str, 
    amount: float, 
    abandonment_count_30d: int = 0, 
    days_overdue: int = 0,
    attempt_number: int = 1
) -> int:
    base_scores = {
        "network_error": 88,
        "auth_timeout": 82,
        "expired_card": 75,
        "checkout_abandoned": 58,
        "insufficient_funds": 50,
        "b2b_overdue": 65
    }
    score = base_scores.get(failure_reason, 25)
    
    if failure_reason == "b2b_overdue":
        score -= min(35, days_overdue * 3)
    if failure_reason in ["insufficient_funds", "expired_card"] and attempt_number > 1:
        score -= (attempt_number - 1) * 10
    if abandonment_count_30d >= 2:
        score -= 15
        
    return max(5, min(98, score))

def verify_translation_integrity(original_text: str, translated_text: str, expected_amount: float) -> str:
    raw_nums = re.findall(r'[\d,]+\.?\d*', translated_text)
    parsed_nums = []
    for n in raw_nums:
        clean_n = n.replace(',', '').rstrip('.')
        try:
            if clean_n:
                parsed_nums.append(float(clean_n))
        except ValueError:
            continue
            
    amount_preserved = any(abs(val - expected_amount) < 1.0 for val in parsed_nums)
    link_preserved = ("[PAYMENT_LINK]" in translated_text) or ("http" in translated_text) or ("rzp.io" in translated_text)
    
    if amount_preserved and link_preserved:
        return translated_text
    return original_text

def evaluate_stop_rule(customer_reply: str) -> tuple[bool, str]:
    stop_keywords = [
        "stop", "unsubscribe", "band karo", "don't message", 
        "dont contact", "nahi chahiye", "spam", "cancel my account", 
        "block", "ruk jao", "mat bhejo"
    ]
    reply_clean = customer_reply.strip().lower()
    for kw in stop_keywords:
        if kw in reply_clean:
            return True, f"Compliance rule triggered by keyword: '{kw}'"
    return False, "Opt-out criteria not triggered"

def detect_dispute_or_utr(customer_reply: str) -> dict:
    reply_clean = customer_reply.strip().lower()
    utr_match = re.search(r'\b\d{12}\b', reply_clean)
    
    dispute_keywords = [
        "cut gaya", "kat gaya", "already paid", "debited", "paise kat gaye", 
        "deducted", "mera paisa", "account se kat gaya", "payment done", "screen shot"
    ]
    has_dispute = any(kw in reply_clean for kw in dispute_keywords)
    
    if utr_match:
        return {
            "is_dispute": True,
            "has_utr": True,
            "utr_number": utr_match.group(0),
            "status": "UTR_RECONCILIATION_PENDING",
            "bot_response": f"Dhanyawad! Aapka UTR reference ({utr_match.group(0)}) receive ho gaya hai. Nudges pause kar diye gaye hain."
        }
    elif has_dispute:
        return {
            "is_dispute": True,
            "has_utr": False,
            "utr_number": None,
            "status": "DISPUTE_HOLD",
            "bot_response": "Agar aapke account se paise kat gaye hain, kripya apna 12-digit UPI UTR number share karein."
        }
        
    return {"is_dispute": False, "has_utr": False, "utr_number": None, "status": "NORMAL_FLOW", "bot_response": None}

def parse_conversational_ptp(customer_reply: str) -> dict:
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key and groq_key != "your_groq_api_key_here":
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            prompt = f"""
            Analyze this customer WhatsApp reply regarding an unpaid bill or failed transaction:
            "{customer_reply}"
            
            Return JSON only:
            {{
              "has_commitment": true/false,
              "promised_date_description": "extracted time or date string",
              "sentiment": "cooperative/neutral/frustrated"
            }}
            """
            res = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            return json.loads(res.choices[0].message.content)
        except Exception:
            pass
            
    reply_lower = customer_reply.lower()
    if any(w in reply_lower for w in ["kal", "tomorrow", "1st", "salary", "friday", "monday", "shaam", "evening", "soon"]):
        return {"has_commitment": True, "promised_date_description": "Next business cycle (extracted verbally)", "sentiment": "cooperative"}
    return {"has_commitment": False, "promised_date_description": None, "sentiment": "neutral"}