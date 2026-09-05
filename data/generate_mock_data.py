import pandas as pd
import random
from core_logic import detect_root_cause_from_gateway

random.seed(42)

names = [
    "Amit Sharma", "Priya Nair", "Rahul Verma", "Sneha Iyer", "Karan Mehta",
    "Divya Reddy", "Vikram Singh", "Anjali Gupta", "Rohan Das", "Neha Kulkarni",
    "Suresh Babu", "Pooja Patel", "Manish Joshi", "Meera Sen", "Arjun Kapoor"
]

raw_gateway_errors = [
    ("GATEWAY_ERROR_DEBIT_FAILED", "UPI Auto-Debit"),
    ("BAD_REQUEST_PAYMENT_TIMED_OUT", "NetBanking Gateway"),
    ("MANDATE_TOKEN_EXPIRED", "Credit Card Vault"),
    ("ORDER_CHECKOUT_ABANDONED", "UPI Express"),
    ("INVOICE_AGING_NET30_OVERDUE", "NEFT/Bank Transfer"),
    ("AUTH_OTP_DROPPED", "Debit Card 3DS OTP")
]

states_languages = [
    ("Maharashtra", "Marathi"),
    ("Tamil Nadu", "Tamil"),
    ("Karnataka", "Kannada"),
    ("Gujarat", "Gujarati"),
    ("West Bengal", "Bengali"),
    ("Telangana", "Telugu"),
    ("Delhi", "Hindi"),
    ("Punjab", "Punjabi")
]

rows = []
for i in range(60):
    raw_error, method = random.choice(raw_gateway_errors)
    state, lang = random.choice(states_languages)
    amount = random.choice([499, 999, 1499, 2499, 4999, 12500, 28000, 54000])
    gross_margin = round(random.uniform(0.18, 0.65), 2)
    
    diagnosed_reason, category, desc = detect_root_cause_from_gateway(raw_error)
    
    abandonment_count = random.choice([0, 1, 1, 2, 3]) if diagnosed_reason == "checkout_abandoned" else 0
    attempt_number = random.choice([1, 2, 3]) if diagnosed_reason in ["insufficient_funds", "expired_card"] else 1
    days_overdue = random.choice([2, 5, 9, 16, 24]) if diagnosed_reason == "b2b_overdue" else 0
    
    rows.append({
        "transaction_id": f"TXN_{202600 + i}",
        "customer_id": f"CUST_{100 + i}",
        "name": random.choice(names),
        "phone": f"9{random.randint(600000000, 999999999)}",
        "amount": amount,
        "gross_margin": gross_margin,
        "abandonment_count_30d": abandonment_count,
        "attempt_number": attempt_number,
        "days_overdue": days_overdue,
        "raw_gateway_error": raw_error,
        "failure_reason": diagnosed_reason,
        "category": category,
        "payment_method": method,
        "state": state,
        "preferred_language": lang,
        "ptp_status": "None",
        "status": "failed"
    })

df = pd.DataFrame(rows)
df.to_csv("failed_payments.csv", index=False)
print("Generated failed_payments.csv with 60 deterministic transactions (Seed 42).")