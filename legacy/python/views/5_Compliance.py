import streamlit as st
from core_logic import evaluate_stop_rule
from ui_helpers import render_simple_explainer

st.title("🛡️ Responsible AI & Compliance Sandbox")
st.caption("Verify customer opt-out stopping rules and manage the global suppression registry.")

render_simple_explainer(
    "Why Compliance Matters in Fintech",
    "Under RBI and telecom regulations, if a customer says 'stop' or 'band karo', businesses must immediately cease messaging. Violating this leads to penalties and phone number blocking.",
    "Our agent checks every reply with zero-token regex rules to instantly honor customer opt-outs."
)

c1, c2 = st.columns(2)

with c1:
    st.subheader("1. Test Inbound Stop Rules")
    test_text = st.text_input("Simulate Customer Inbound Reply", placeholder="e.g., band karo, stop messaging me, nahi chahiye")
    phone_to_test = st.text_input("Associated Phone Number", "9876543210")
    
    if st.button("Evaluate Compliance Rule"):
        is_opt_out, reason = evaluate_stop_rule(test_text)
        if is_opt_out:
            st.session_state.blacklisted_numbers.add(phone_to_test)
            st.error(f"🛑 STOP-RULE TRIGGERED: {reason}")
            st.warning(f"Phone number {phone_to_test} has been permanently added to the suppression list.")
        else:
            st.success("✅ Normal response. Communication workflow may proceed.")

with c2:
    st.subheader("2. Active Suppression Registry (Do-Not-Contact)")
    if st.session_state.blacklisted_numbers:
        for num in st.session_state.blacklisted_numbers:
            st.code(f"🚫 {num} — Permanent Opt-Out Honored")
    else:
        st.info("Suppression registry is currently empty.")