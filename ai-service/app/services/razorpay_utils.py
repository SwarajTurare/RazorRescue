import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

def create_razorpay_payment_link(amount: float, customer_name: str, phone: str, txn_id: str) -> str:
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    
    if key_id.startswith("rzp_test_") and key_secret != "placeholder_secret":
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            link_payload = {
                "amount": int(amount * 100),
                "currency": "INR",
                "accept_partial": False,
                "description": f"RazorRescue Recovery for {txn_id}",
                "customer": {
                    "name": customer_name,
                    "contact": f"+91{phone[-10:]}"
                },
                "notify": {"sms": False, "email": False},
                "reminder_enable": False,
                "notes": {
                    "source": "RazorRescue_Agent",
                    "txn_id": txn_id
                }
            }
            res = client.payment_link.create(link_payload)
            if "short_url" in res:
                return res["short_url"]
        except Exception:
            pass
            
    return f"https://rzp.io/i/{txn_id}"