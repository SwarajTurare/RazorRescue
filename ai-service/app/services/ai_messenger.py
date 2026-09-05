import os
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are Recover-GPT, an intelligent financial recovery assistant for Indian businesses.
Write a concise, professional, yet warm WhatsApp notification (2-3 sentences max).
Include:
1. Clear statement of the transaction issue.
2. Direct action required.
3. The placeholder link: [PAYMENT_LINK].
Keep tone helpful, polite, and persuasive without sounding desperate or aggressive."""

def generate_ai_recovery_message(name: str, amount: float, failure_reason: str, action: str, explanation: str) -> str:
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    
    if groq_key and groq_key != "your_groq_api_key_here":
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            prompt = f"""
            Customer Name: {name}
            Amount Due: Rs. {amount:,.2f}
            Root Cause: {failure_reason}
            Prescribed Action: {action}
            Context: {explanation}
            
            Generate the short Hinglish/English WhatsApp recovery message.
            """
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=180
            )
            return response.choices[0].message.content.strip()
        except Exception:
            pass

    templates = {
        "network_error": f"Namaste {name}, aapka Rs. {amount:,.2f} ka payment network issue ki wajah se complete nahi ho paya. Is direct link se 1-click me retry karein: [PAYMENT_LINK]",
        "expired_card": f"Hi {name}, aapka card mandate process nahi ho saka. Service chalu rakhne ke liye yahan card details update karein: [PAYMENT_LINK]",
        "checkout_abandoned": f"Namaste {name}, aapke cart ka order pending hai (Rs. {amount:,.2f}). Is special checkout link se turant purchase complete karein: [PAYMENT_LINK]",
        "insufficient_funds": f"Hello {name}, aapka subscription payment process nahi ho saka. We have scheduled an auto-retry, ya aap manually yahan pay kar sakte hain: [PAYMENT_LINK]",
        "b2b_overdue": f"Dear {name}, gentle reminder regarding overdue invoice of Rs. {amount:,.2f}. Kindly review and reconcile your statement here: [PAYMENT_LINK]",
        "auth_timeout": f"Namaste {name}, aapka OTP verification session expire ho gaya tha. Rs. {amount:,.2f} ka payment complete karne ke liye yahan click karein: [PAYMENT_LINK]"
    }
    return templates.get(failure_reason, f"Hello {name}, your transaction of Rs. {amount:,.2f} requires attention. Please complete it here: [PAYMENT_LINK]")