import os
import base64

from functools import lru_cache

from io import BytesIO

import requests

from dotenv import load_dotenv


load_dotenv()


# ============================================================
# LANGUAGE → SARVAM CODE
# ============================================================

SARVAM_LANG_MAP = {
    "Hindi": "hi-IN",
    "Marathi": "mr-IN",
    "Tamil": "ta-IN",
    "Telugu": "te-IN",
    "Kannada": "kn-IN",
    "Bengali": "bn-IN",
    "Gujarati": "gu-IN",
    "Punjabi": "pa-IN",
    "English": "en-IN",
    "Hinglish": "hi-IN",
}


# ============================================================
# SARVAM SPEAKERS
# ============================================================

SARVAM_SPEAKER_MAP = {
    "hi-IN": "shubh",
    "mr-IN": "shubh",
    "ta-IN": "priya",
    "te-IN": "priya",
    "kn-IN": "kavya",
    "bn-IN": "ritu",
    "gu-IN": "shubh",
    "pa-IN": "shubh",
    "en-IN": "ritu",
}


# ============================================================
# CLEAN MESSAGE
# ============================================================

def _clean_text(text: str) -> str:
    """
    Clean placeholder tokens before sending
    customer communication to TTS.
    """

    cleaned = (
        text or ""
    ).replace(
        "[PAYMENT_LINK]",
        "payment link"
    )

    cleaned = cleaned.replace(
        "Rs.",
        "Rupees "
    )

    cleaned = cleaned.replace(
        "₹",
        "Rupees "
    )

    return cleaned.strip()[:4000]


# ============================================================
# SARVAM
# ============================================================

def _generate_with_sarvam(
    text: str,
    language_code: str,
    speaker: str,
) -> bytes | None:

    api_key = os.getenv(
        "SARVAM_API_KEY",
        ""
    ).strip()

    if not api_key:
        return None

    if api_key == "your_sarvam_api_key_here":
        return None

    try:

        url = (
            "https://api.sarvam.ai/"
            "text-to-speech"
        )

        headers = {
            "api-subscription-key":
                api_key,

            "Content-Type":
                "application/json",
        }

        payload = {
            "text": text,
            "target_language_code":
                language_code,
            "speaker": speaker,
            "pace": 1.0,
            "model": "bulbul:v3",
            "output_audio_codec":
                "mp3",
        }

        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        audios = data.get(
            "audios"
        )

        if not audios:
            return None

        return base64.b64decode(
            audios[0]
        )

    except Exception:
        return None


# ============================================================
# GTTS FALLBACK
# ============================================================

def _generate_with_gtts(
    text: str,
    language_code: str,
) -> bytes | None:

    try:

        from gtts import gTTS

        language = language_code.split(
            "-"
        )[0]

        tts = gTTS(
            text=text,
            lang=language,
            slow=False,
        )

        buffer = BytesIO()

        tts.write_to_fp(
            buffer
        )

        return buffer.getvalue()

    except Exception:
        return None


# ============================================================
# MAIN VOICE GENERATOR
# ============================================================

@lru_cache(maxsize=50)
def synthesize_regional_voice_note_cached(
    text: str,
    language_name: str,
) -> bytes | None:

    clean_text = _clean_text(
        text
    )

    if not clean_text:
        return None

    # Normalize language name.
    language_name = (
        language_name or "Hindi"
    ).strip()

    language_code = (
        SARVAM_LANG_MAP.get(
            language_name,
            "hi-IN",
        )
    )

    speaker = (
        SARVAM_SPEAKER_MAP.get(
            language_code,
            "shubh",
        )
    )

    # ========================================================
    # 1. SARVAM FIRST
    # ========================================================

    sarvam_audio = (
        _generate_with_sarvam(
            clean_text,
            language_code,
            speaker,
        )
    )

    if sarvam_audio:
        return sarvam_audio

    # ========================================================
    # 2. GTTS FALLBACK
    # ========================================================

    return _generate_with_gtts(
        clean_text,
        language_code,
    )