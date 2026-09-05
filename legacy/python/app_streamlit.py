import os
import streamlit as st
import pandas as pd
from database import init_db
from ui_helpers import inject_mobile_and_beginner_css

st.set_page_config(
    page_title="RazorRescue | AI Revenue Recovery",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

inject_mobile_and_beginner_css()
init_db()

if not os.path.exists("failed_payments.csv"):
    import generate_mock_data

def load_clean_dataset() -> pd.DataFrame:
    df_raw = pd.read_csv("failed_payments.csv", keep_default_na=False)
    df_raw["ptp_status"] = df_raw["ptp_status"].astype(str)
    df_raw["phone"] = df_raw["phone"].astype(str)
    return df_raw

if "df" not in st.session_state:
    st.session_state.df = load_clean_dataset()
if "recovered_amount" not in st.session_state:
    st.session_state.recovered_amount = 0.0
if "penalties_saved" not in st.session_state:
    st.session_state.penalties_saved = 0.0
if "blacklisted_numbers" not in st.session_state:
    st.session_state.blacklisted_numbers = set()

with st.sidebar:
    st.markdown("### ⚡ **RazorRescue AI**")
    st.caption("AI-Powered Money Recovery for Indian Businesses")
    st.markdown("<span style='color:#34D399; font-weight:600; font-size:12px;'>● Razorpay Test Mode: Connected</span>", unsafe_allow_html=True)
    st.markdown("---")
    
    st.info("💡 **What this app does:** When customer payments fail (like UPI glitches or low balance), this AI agent diagnoses the issue and sends a friendly WhatsApp message in their local language with a 1-click retry link.")
    
    if st.button("🔄 Reset Demo Data", use_container_width=True):
        st.session_state.recovered_amount = 0.0
        st.session_state.penalties_saved = 0.0
        st.session_state.blacklisted_numbers = set()
        st.session_state.df = load_clean_dataset()
        st.rerun()

dashboard_page = st.Page("views/1_Dashboard.py", title="Executive Overview", icon="📊", default=True)
triage_page = st.Page("views/2_Triage_Studio.py", title="Triage & WhatsApp Studio", icon="🎯")
batch_page = st.Page("views/3_Batch_Engine.py", title="Batch Recovery (60 Txns)", icon="⚡")
ptp_page = st.Page("views/4_Conversational_PTP.py", title="Promise-to-Pay (Chat)", icon="📅")
compliance_page = st.Page("views/5_Compliance.py", title="Customer Opt-Out & Safety", icon="🛑")
audit_page = st.Page("views/6_Audit_Ledger.py", title="Audit Logs & PDF Report", icon="📋")
roi_page = st.Page("views/7_ROI_Calculator.py", title="Business Savings Calculator", icon="💰")

pg = st.navigation({
    "Main Workspaces": [dashboard_page, triage_page, batch_page],
    "Customer Communication": [ptp_page, compliance_page],
    "Reports & Savings": [audit_page, roi_page]
})

pg.run()