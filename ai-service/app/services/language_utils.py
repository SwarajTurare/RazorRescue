import os

from dotenv import load_dotenv


load_dotenv()


# ============================================================
# STATE → LANGUAGE
# ============================================================

STATE_TO_LANGUAGE = {
    "Maharashtra": "Marathi",
    "Tamil Nadu": "Tamil",
    "West Bengal": "Bengali",
    "Karnataka": "Kannada",
    "Gujarat": "Gujarati",
    "Punjab": "Punjabi",
    "Delhi": "Hindi",
    "Telangana": "Telugu",
}


# ============================================================
# LANGUAGE → TRANSLATION CODE
# ============================================================

LANGUAGE_TO_CODE = {
    "Hindi": "hi",
    "Hinglish": "hi",
    "Marathi": "mr",
    "Tamil": "ta",
    "Bengali": "bn",
    "Kannada": "kn",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Telugu": "te",
    "English": "en",
}


# ============================================================
# GET LANGUAGE FROM STATE
# ============================================================

def get_language_for_state(
    state: str,
) -> str:

    return STATE_TO_LANGUAGE.get(
        state,
        "Hindi",
    )


# ============================================================
# GET LANGUAGE CODE
# ============================================================

def get_language_code(
    language_name: str,
) -> str:

    return LANGUAGE_TO_CODE.get(
        language_name,
        "hi",
    )


# ============================================================
# TRANSLATE
# ============================================================

def translate_message(
    text: str,
    target_language: str,
) -> str:

    if not text:
        return text

    if target_language in {
        "English",
        "Hinglish",
    }:
        return text

    # ========================================================
    # GROQ TRANSLATION
    # ========================================================

    groq_key = os.getenv(
        "GROQ_API_KEY",
        "",
    ).strip()

    if (
        groq_key
        and groq_key
        != "your_groq_api_key_here"
    ):
        try:

            from groq import Groq

            client = Groq(
                api_key=groq_key
            )

            prompt = f"""
Translate and culturally adapt the following
recovery message into natural conversational
{target_language}.

Rules:
- Preserve URLs exactly.
- Preserve currency amounts exactly.
- Preserve transaction IDs exactly.
- Preserve numeric values exactly.
- Do not add explanations.
- Return only the translated customer message.

Original:
{text}
"""

            response = (
                client
                .chat
                .completions
                .create(
                    model=(
                        "llama-3.3-70b-versatile"
                    ),
                    messages=[
                        {
                            "role":
                                "user",
                            "content":
                                prompt,
                        }
                    ],
                    temperature=0.2,
                    max_tokens=300,
                )
            )

            translated = (
                response
                .choices[0]
                .message
                .content
                .strip()
            )

            if translated:
                return translated

        except Exception:
            pass

    # ========================================================
    # FALLBACK TRANSLATOR
    # ========================================================

    try:

        from deep_translator import (
            GoogleTranslator
        )

        code = get_language_code(
            target_language
        )

        translated = (
            GoogleTranslator(
                source="auto",
                target=code,
            )
            .translate(text)
        )

        return (
            translated
            if translated
            else text
        )

    except Exception:
        return text