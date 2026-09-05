import streamlit as st
from database import fetch_audit_dataframe, run_custom_query
from pdf_generator import build_pdf_report
from ui_helpers import render_simple_explainer

st.title("📋 SQLite Immutable Audit Ledger & PDF Report")
st.caption("Query persistent recovery logs directly using SQL and generate compliance audit documents.")

render_simple_explainer(
    "Immutable Audit Logs in Fintech",
    "Every automated recovery attempt, discount calculation, and penalty saved is logged in a permanent SQLite database so finance teams can inspect every action.",
    "Like an unchangeable bank statement that records every message sent and every rupee recovered."
)

st.subheader("1. Interactive SQL Analytics Terminal")
default_sql = "SELECT failure_reason, COUNT(*) as total_events, SUM(amount) as total_at_risk, SUM(bounce_fee_saved) as fees_saved FROM recovery_audit GROUP BY 1"
sql_input = st.text_area("Write Custom SQL Query", default_sql, height=80)

if st.button("Run SQL Query"):
    try:
        res_df = run_custom_query(sql_input)
        st.dataframe(res_df, use_container_width=True)
    except Exception as e:
        st.error(f"SQL Error: {e}")

st.markdown("---")
st.subheader("2. Complete Audit History & Export")
audit_df = fetch_audit_dataframe()

if len(audit_df) > 0:
    st.dataframe(audit_df, use_container_width=True, height=220)
    
    total_lost = float(st.session_state.df["amount"].sum())
    total_recovered = float(st.session_state.recovered_amount)
    penalties_saved = float(st.session_state.penalties_saved)
    
    pdf_path = build_pdf_report(audit_df.to_dict(orient="records"), total_lost, total_recovered, penalties_saved)
    with open(pdf_path, "rb") as f:
        st.download_button(
            label="📥 Download Executive Recovery Audit Report (PDF)",
            data=f,
            file_name="RazorRescue_Executive_Audit.pdf",
            mime="application/pdf",
            type="primary"
        )
else:
    st.info("No audit logs available. Execute workflows from the Triage Studio or Batch Orchestrator.")