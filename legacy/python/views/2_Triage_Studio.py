import urllib.parse
import qrcode
from io import BytesIO
import streamlit as st
import plotly.graph_objects as go
from core_logic import detect_root_cause_from_gateway
from language_utils import get_language_for_state, LANGUAGE_TO_CODE
from graph_agent import run_recovery_pipeline
from voice_utils import synthesize_regional_voice_note_cached
from database import log_recovery_event
from ui_helpers import render_simple_explainer, render_mobile_whatsapp_preview

st.title("🎯 Single-Customer Triage Studio")
st.caption("Ingest raw gateway errors, execute LangGraph conditional pipelines, and preview regional WhatsApp nudges.")

df = st.session_state.df

render_simple_explainer(
    "How Recovery Triage Works",
    "Different payment problems require different solutions. A network timeout needs an instant retry, an empty bank account needs a salary-day reschedule, and an overdue invoice requires an installment plan.",
    "The AI ingests raw gateway error codes and derives the exact financial intervention."
)

col_left, col_right = st.columns([1.1, 0.9])

with col_left:
    st.subheader("Step 1: Ingest & Diagnose Failed Payment")
    selected_txn = st.selectbox(
        "Choose a transaction to inspect:",
        df["transaction_id"] + " — " + df["name"] + " (₹" + df["amount"].astype(str) + " - " + df.get("raw_gateway_error", df["failure_reason"]) + ")"
    )
    txn_id = selected_txn.split(" — ")[0]
    record = df[df["transaction_id"] == txn_id].iloc[0]
    
    raw_code = record.get("raw_gateway_error", "BAD_REQUEST_PAYMENT_TIMED_OUT")
    diagnosed_reason, category, description = detect_root_cause_from_gateway(raw_code)
    
    target_phone = st.text_input("Customer Mobile Number:", value=str(record["phone"]))
    
    c_st, c_lg = st.columns(2)
    with c_st:
        sel_state = st.selectbox("Customer State:", list(LANGUAGE_TO_CODE.keys()), index=0)
    with c_lg:
        available_langs = ["Hinglish"] + [k for k in LANGUAGE_TO_CODE.keys() if k != "English"] + ["English"]
        target_lang = st.selectbox("Language to send message in:", available_langs, index=0)
        if target_lang == "Hinglish":
            target_lang = get_language_for_state(sel_state)
            
    st.markdown("---")
    st.markdown("#### 📋 Gateway Detection & Root Cause")
    st.write(f"* **Raw Gateway Code:** `{raw_code}`")
    st.write(f"* **Diagnosed Root Cause:** `{diagnosed_reason}` ({category})")
    st.caption(f"ℹ️ {description}")
    st.write(f"* **Mandate Attempt #:** `{record.get('attempt_number', 1)}`")
    st.write(f"* **Invoice Aging:** `{record.get('days_overdue', 0)} days overdue`")
    st.write(f"* **Gross Margin:** `{int(record['gross_margin']*100)}%`")

with col_right:
    st.subheader("Step 2: LangGraph Execution & Overrides")
    
    c_tog1, c_tog2 = st.columns(2)
    with c_tog1:
        simulate_night = st.checkbox("🌙 Simulate Quiet Hours (11 PM IST)", value=False, help="Forces is_quiet_window=True to demo TRAI 9 PM - 9 AM contact-hour queueing live at daytime.")
    with c_tog2:
        force_approve = st.checkbox("⚡ Force Approve (HITL Override)", value=False, help="Authorizes high-ticket or terminal escalation dispatch.")

    if st.button("🚀 Run LangGraph Recovery Pipeline", type="primary", use_container_width=True):
        is_blacklisted = target_phone in st.session_state.blacklisted_numbers
        sim_hour = 23 if simulate_night else None
        
        with st.spinner("Executing StateGraph routing and voice synthesis..."):
            output = run_recovery_pipeline(
                record.to_dict(), 
                target_lang, 
                is_suppressed=is_blacklisted,
                force_dispatch=False,
                force_approve=force_approve,
                simulated_hour=sim_hour
            )
            decision = output.get("decision", {})
            confidence = output.get("confidence", 0)
            status = output.get("status", "Pending")
            effective_amount = output.get("effective_amount", record["amount"])
            
            if "Suppressed" in status:
                st.error("🛑 Graph Branch: `suppression_node` — Customer in Opt-Out Registry.")
            elif "Queued" in status:
                st.warning(f"🌙 Graph Branch: `quiet_hours_gate_node` — {status}")
                st.info("TRAI TCCCPR Regulation active: Commercial messaging paused between 9 PM and 9 AM. Uncheck 'Simulate Quiet Hours' to test live daytime dispatch.")
            elif "Awaiting" in status:
                st.warning(f"⚠️ Graph Branch: `hitl_gate_node` — {status}")
                st.info("High financial value (>= ₹25k) or terminal escalation detected. Check 'Force Approve' above to authorize dispatch.")
            else:
                st.success(f"✅ Graph Branch: `localization_node` — Action: {decision.get('action')}")
                if effective_amount != record["amount"]:
                    st.info(f"💡 Synchronized Effective Amount: **₹{effective_amount:,.2f}** (Base: ₹{record['amount']:,.2f})")
                    
                final_msg = output["final_message"]
                spoken_msg = output.get("spoken_message", final_msg)
                payment_url = output["retry_url"]
                
                st.session_state.penalties_saved += decision.get("bounce_fee_saved", 0.0)
                
                fig = go.Figure(go.Indicator(
                    mode="gauge+number",
                    value=confidence,
                    title={'text': "Recovery Probability (%)", 'font': {'size': 13, 'color': '#94A3B8'}},
                    gauge={
                        'axis': {'range': [0, 100]},
                        'bar': {'color': "#10B981" if confidence >= 70 else "#F59E0B" if confidence >= 40 else "#EF4444"},
                        'bgcolor': "rgba(30, 41, 59, 0.5)"
                    }
                ))
                fig.update_layout(height=150, margin=dict(l=10, r=10, t=25, b=10), paper_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig, use_container_width=True)
                
                audio_bytes = synthesize_regional_voice_note_cached(spoken_msg, target_lang)
                if audio_bytes:
                    st.audio(audio_bytes, format="audio/mp3")
                    st.caption(f"🔊 AI Voice Note (Synthesized in native {target_lang})")

                render_mobile_whatsapp_preview(record["name"], final_msg, payment_url)
                
                clean_phone = target_phone if target_phone.startswith("91") else f"91{target_phone}"
                wa_link = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(final_msg)}"
                
                c_wa, c_qr = st.columns([1.2, 0.8])
                with c_wa:
                    st.markdown(f"""
                    <a href="{wa_link}" target="_blank" style="text-decoration:none;">
                        <div style="background-color:#25D366; color:white; padding:12px; border-radius:10px; text-align:center; font-weight:700; margin-top:8px;">
                            📲 Test: Send via WhatsApp
                        </div>
                    </a>
                    """, unsafe_allow_html=True)
                with c_qr:
                    qr = qrcode.make(payment_url)
                    buf = BytesIO()
                    qr.save(buf, format="PNG")
                    st.image(buf.getvalue(), caption="Scan to Pay via UPI", width=105)
                    
                log_recovery_event({
                    "txn_id": record["transaction_id"],
                    "customer": record["name"],
                    "phone": target_phone,
                    "amount": effective_amount,
                    "gross_margin": record["gross_margin"],
                    "reason": diagnosed_reason,
                    "action": decision.get("action", "N/A"),
                    "language": target_lang,
                    "confidence": confidence,
                    "bounce_fee_saved": decision.get("bounce_fee_saved", 0.0),
                    "status": "Contacted"
                })
                
                import random
                if random.random() < (confidence / 100.0) * 0.70:
                    st.session_state.recovered_amount += float(effective_amount)
                    st.balloons()
                    st.toast(f"🎉 Success: ₹{effective_amount:,.0f} recovered!")