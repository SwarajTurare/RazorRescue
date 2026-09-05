import os
from dotenv import load_dotenv

load_dotenv()

STATE_TO_LANGUAGE = {
    "Maharashtra": "Marathi",
    "Tamil Nadu": "Tamil",
    "West Bengal": "Bengali",
    "Karnataka": "Kannada",
    "Gujarat": "Gujarati",
    "Punjab": "Punjabi",
    "Delhi": "Hindi",
    "Telangana": "Telugu"
}

LANGUAGE_TO_CODE = {
    "Hindi": "hi",
    "Marathi": "mr",
    "Tamil": "ta",
    "Bengali": "bn",
    "Kannada": "kn",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Telugu": "te",
    "English": "en"
}

def get_language_for_state(state: str) -> str:
    return STATE_TO_LANGUAGE.get(state, "Hindi")

def get_language_code(language_name: str) -> str:
    return LANGUAGE_TO_CODE.get(language_name, "hi")

def translate_message(text: str, target_language: str) -> str:
    if target_language in ["English", "Hinglish"]:
        return text
        
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key and groq_key != "your_groq_api_key_here":
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            prompt = f"""
            Translate and culturally adapt this recovery message into conversational {target_language} in native script.
            Preserve all URLs, currency symbols, and numerical amounts exactly.
            
            Original Text:
            {text}
            """
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=200
            )
            return res.choices[0].message.content.strip()
        except Exception:
            pass

    try:
        from deep_translator import GoogleTranslator
        code = get_language_code(target_language)
        translated = GoogleTranslator(source="auto", target=code).translate(text)
        return translated if translated else text
    except Exception:
        return text