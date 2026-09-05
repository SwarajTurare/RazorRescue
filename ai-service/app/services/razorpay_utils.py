import os

import razorpay

from dotenv import load_dotenv


load_dotenv()


def create_razorpay_payment_link(
    amount: float,
    customer_name: str,
    phone: str,
    txn_id: str,
) -> str:

    key_id = os.getenv(
        "RAZORPAY_KEY_ID",
        ""
    ).strip()

    key_secret = os.getenv(
        "RAZORPAY_KEY_SECRET",
        ""
    ).strip()

    # ========================================================
    # REAL RAZORPAY TEST LINK
    # ========================================================

    if (
        key_id.startswith(
            "rzp_test_"
        )
        and key_secret
        and key_secret
            != "placeholder_secret"
    ):
        try:
            client = razorpay.Client(
                auth=(
                    key_id,
                    key_secret,
                )
            )

            payload = {
                "amount": int(
                    round(
                        amount * 100
                    )
                ),

                "currency": "INR",

                "accept_partial":
                    False,

                "description":
                    (
                        "RazorRescue "
                        "Recovery for "
                        f"{txn_id}"
                    ),

                "customer": {
                    "name":
                        customer_name,

                    "contact":
                        (
                            "+91"
                            + str(
                                phone
                            )[-10:]
                        ),
                },

                "notify": {
                    "sms": False,
                    "email": False,
                },

                "reminder_enable":
                    False,

                "notes": {
                    "source":
                        "RazorRescue_Agent",

                    "txn_id":
                        txn_id,
                },
            }

            response = (
                client
                .payment_link
                .create(
                    payload
                )
            )

            short_url = (
                response.get(
                    "short_url"
                )
            )

            if short_url:
                return short_url

        except Exception as error:
            print(
                "[RazorRescue] "
                "Razorpay payment link "
                f"failed: {error}"
            )

    # ========================================================
    # DO NOT RETURN FAKE rzp.io URL
    #
    # The frontend recognizes absence/old fallback and
    # creates a local functional demo payment page.
    # ========================================================

    return ""