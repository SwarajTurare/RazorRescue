import streamlit as st
from core_logic import parse_conversational_ptp, detect_dispute_or_utr
from ui_helpers import render_simple_explainer

st.title("📅 Conversational PTP & Dispute Resolution Loop")
st.caption("Handles customer promises, pauses retries, and automatically resolves 'Money Deducted' claims with UTR tracking.")

render_simple_explainer(
    "The 'Money Deducted' (Paisa Kat Gaya) Problem",
    "Often, when a payment fails, money is debited from the customer's bank but not yet acknowledged by the gateway. Standard bots keep demanding money, which frustrates customers.",
    "Our AI recognizes claims like 'Paisa kat gaya' or 12-digit UTR numbers, halts recovery nudges immediately, and logs the transaction for bank reconciliation."
)

# Ensure ptp_status is explicitly typed as object/string to prevent float64 type errors
if "ptp_status" in st.session_state.df.columns:
    st.session_state.df["ptp_status"] = st.session_state.df["ptp_status"].astype("object").fillna("None")

df = st.session_state.df

col1, col2 = st.columns([1.1, 0.9])

with col1:
    st.subheader("1. Inbound WhatsApp Reply Simulator")
    selected_account = st.selectbox("Select Account Receiving Message", df["transaction_id"] + " — " + df["name"])
    txn_id = selected_account.split(" — ")[0]
    
    demo_scenario = st.radio(
        "Choose a real-world customer reply scenario:",
        [
            "Scenario A: 'Paisa kat gaya mere account se!' (Dispute claim)",
            "Scenario B: 'Paid via GPay, UTR: 428901829102' (UTR proof)",
            "Scenario C: 'Salary aane par 1st ko dunga' (PTP commitment)",
            "Scenario D: Custom Text Input"
        ]
    )
    
    if "Scenario A" in demo_scenario:
        default_text = "Mere account se ₹1,499 kat gaya hai! Bar bar message mat bhejo!"
    elif "Scenario B" in demo_scenario:
        default_text = "Check karo, payment ho gaya hai UTR number 428901829102"
    elif "Scenario C" in demo_scenario:
        default_text = "Abhi balance nahi hai, 1st tarikh ko salary ke baad pay karunga"
    else:
        default_text = ""
        
    customer_reply = st.text_input("Customer WhatsApp Message:", value=default_text)
    
    if st.button("📲 Simulate Inbound Message Event", type="primary", use_container_width=True):
        dispute_check = detect_dispute_or_utr(customer_reply)
        
        if dispute_check["is_dispute"]:
            if dispute_check["has_utr"]:
                st.session_state.df.loc[st.session_state.df["transaction_id"] == txn_id, "ptp_status"] = f"UTR Reconciling: {dispute_check['utr_number']}"
                st.success(f"🛡️ **UTR Verified:** {dispute_check['utr_number']}")
                st.info("**Agent Action:** Recovery nudges stopped. Gateway auto-reconciliation initiated.")
            else:
                st.session_state.df.loc[st.session_state.df["transaction_id"] == txn_id, "ptp_status"] = "Dispute: Money Deducted Claim"
                st.warning("⚠️ **Dispute Flagged:** Customer claims account was already debited.")
                st.info(f"**Agent Response to User:** '{dispute_check['bot_response']}'")
            st.rerun()
        else:
            ptp_res = parse_conversational_ptp(customer_reply)
            if ptp_res.get("has_commitment"):
                date_str = ptp_res.get("promised_date_description", "Next Salary Window")
                st.session_state.df.loc[st.session_state.df["transaction_id"] == txn_id, "ptp_status"] = f"Promised: {date_str}"
                st.success(f"✅ **Promise-to-Pay Extracted:** '{date_str}' (Sentiment: {ptp_res.get('sentiment')})")
                st.info(f"**Agent Action:** Recovery nudges paused until {date_str}.")
                st.rerun()
            else:
                st.warning("No date commitment or dispute identified in message.")

with col2:
    st.subheader("2. Real-Time Commitment & Dispute Ledger")
    active_ledger = st.session_state.df[
        (st.session_state.df["ptp_status"] != "None") & 
        (st.session_state.df["ptp_status"].notna())
    ][["transaction_id", "name", "amount", "ptp_status"]]
    
    if len(active_ledger) > 0:
        st.dataframe(active_ledger, use_container_width=True)
    else:
        st.info("No active commitments or disputes logged yet. Test a scenario from the left panel.")