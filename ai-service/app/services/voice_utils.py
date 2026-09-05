import os
import base64
from functools import lru_cache
from io import BytesIO

import requests
from dotenv import load_dotenv

load_dotenv()

SARVAM_LANG_MAP = {
    "Hindi": "hi-IN",
    "Marathi": "mr-IN",
    "Tamil": "ta-IN",
    "Bengali": "bn-IN",
    "Kannada": "kn-IN",
    "Gujarati": "gu-IN",
    "Punjabi": "pa-IN",
    "Telugu": "te-IN",
    "English": "en-IN",
    "Hinglish": "hi-IN"
}

SARVAM_SPEAKER_MAP = {
    "hi-IN": "shubh",
    "mr-IN": "shubh",
    "ta-IN": "priya",
    "te-IN": "priya",
    "kn-IN": "kavya",
    "bn-IN": "ritu",
    "gu-IN": "shubh",
    "pa-IN": "shubh",
    "en-IN": "ritu"
}

def _clean_text(text: str) -> str:
    return (text or "").replace("[PAYMENT_LINK]", "link par").replace("Rs.", "Rupees ").replace("₹", "Rupees ").strip()

@lru_cache(maxsize=50)
def synthesize_regional_voice_note_cached(text: str, language_name: str) -> bytes | None:
    """Generate regional speech without any Streamlit dependency.

    Sarvam is preferred when configured; gTTS is a fallback for demo/development.
    The function is cached in-process to avoid duplicate synthesis requests.
    """
    clean_text = _clean_text(text)[:4000]
    sarvam_api_key = os.getenv("SARVAM_API_KEY", "").strip()
    lang_code = SARVAM_LANG_MAP.get(language_name, "hi-IN")
    speaker = SARVAM_SPEAKER_MAP.get(lang_code, "shubh")

    if sarvam_api_key and sarvam_api_key != "your_sarvam_api_key_here":
        try:
            url = "https://api.sarvam.ai/text-to-speech"
            headers = {"api-subscription-key": sarvam_api_key, "Content-Type": "application/json"}
            payload = {
                "text": clean_text,
                "target_language_code": lang_code,
                "speaker": speaker,
                "pace": 1.0,
                "model": "bulbul:v3",
                "output_audio_codec": "mp3",
            }
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            if res.ok:
                data = res.json()
                if data.get("audios"):
                    return base64.b64decode(data["audios"][0])
        except Exception:
            pass

    try:
        from gtts import gTTS
        tts = gTTS(text=clean_text, lang=lang_code.split("-")[0], slow=False)
        buf = BytesIO()
        tts.write_to_fp(buf)
        return buf.getvalue()
    except Exception:
        return None
