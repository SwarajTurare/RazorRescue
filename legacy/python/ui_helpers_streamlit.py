import streamlit as st

def inject_mobile_and_beginner_css():
    st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        
        .stApp { background-color: #0B0F17; color: #F1F5F9; }
        
        .metric-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }
        
        .simple-card {
            background: rgba(37, 99, 235, 0.1);
            border-left: 4px solid #3B82F6;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 10px 0;
            font-size: 13px;
            color: #BFDBFE;
            line-height: 1.5;
        }

        @media (max-width: 768px) {
            .stApp { padding: 8px !important; }
            .metric-card { padding: 12px !important; }
            h1 { font-size: 22px !important; }
            h2 { font-size: 18px !important; }
            h3 { font-size: 16px !important; }
            .stButton > button {
                width: 100% !important;
                padding: 12px !important;
                font-size: 15px !important;
            }
        }
    </style>
    """, unsafe_allow_html=True)

def render_simple_explainer(title: str, simple_explanation: str, everyday_analogy: str):
    with st.expander(f"💡 In Simple Words: {title}"):
        st.markdown(f"""
        <div class="simple-card">
            <b>What is this?</b> {simple_explanation}<br><br>
            <b>Everyday Analogy:</b> <i>{everyday_analogy}</i>
        </div>
        """, unsafe_allow_html=True)

def render_mobile_whatsapp_preview(customer_name: str, message: str, payment_url: str):
    st.markdown(f"""
    <div style="
        background: #111B21;
        border: 2px solid #222E35;
        border-radius: 18px;
        padding: 14px;
        max-width: 100%;
        margin: 10px auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    ">
        <div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid #222E35; padding-bottom:8px; margin-bottom:10px;">
            <div style="width:34px; height:34px; border-radius:50%; background:#00A884; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:13px;">
                R
            </div>
            <div>
                <div style="color:#E9EDEF; font-size:13px; font-weight:600;">RazorRescue Official</div>
                <div style="color:#8696A0; font-size:10px;">Verified Payment Assistant</div>
            </div>
        </div>
        <div style="
            background: #005C4B;
            color: #E9EDEF;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 12.5px;
            line-height: 1.45;
            margin-bottom: 8px;
            word-break: break-word;
        ">
            {message}
            <div style="text-align:right; font-size:9px; color:#8696A0; margin-top:4px;">Delivered ✓✓</div>
        </div>
    </div>
    """, unsafe_allow_html=True)