import streamlit as st
from ui_helpers import render_simple_explainer

st.title("💰 Merchant ARR & ROI Simulator")
st.caption("Model the financial impact and business case of RazorRescue on enterprise merchant bottom lines.")

render_simple_explainer(
    "Annual Recurring Revenue (ARR) Savings",
    "This calculator shows how much additional profit a merchant can recover over an entire year by recovering failed transactions automatically.",
    "If a business sells ₹50 Lakhs a month and loses 15% to payment drops, recovering just one-third of that adds ₹30 Lakhs back to annual revenue."
)

c1, c2 = st.columns(2)

with c1:
    gmv = st.slider("Monthly Gross Merchandise Value (GMV)", 500000, 50000000, 5000000, 500000, format="₹%d")
    drop_pct = st.slider("Payment Drop-off Rate", 5, 30, 15, format="%d%%")
    recovery_pct = st.slider("Projected RazorRescue Recovery Efficiency", 15, 50, 34, format="%d%%")

with c2:
    at_risk_monthly = gmv * (drop_pct / 100.0)
    recovered_monthly = at_risk_monthly * (recovery_pct / 100.0)
    arr_saved = recovered_monthly * 12
    
    st.markdown("<div class='metric-card'>", unsafe_allow_html=True)
    st.markdown("### Projected Annual Revenue Recovered (ARR)")
    st.markdown(f"<h1 style='color:#34D399;'>₹{arr_saved:,.0f}</h1>", unsafe_allow_html=True)
    st.markdown(f"**Monthly Revenue Recovered:** ₹{recovered_monthly:,.0f}")
    st.markdown(f"**Annual Revenue at Risk:** ₹{at_risk_monthly * 12:,.0f}")
    st.markdown("</div>", unsafe_allow_html=True)