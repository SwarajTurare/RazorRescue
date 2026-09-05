from __future__ import annotations

import base64
import os
import tempfile
from typing import Any

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agents.graph_agent import run_recovery_pipeline

from .services.ai_messenger import (
    generate_ai_recovery_message,
)

from .services.core_logic import (
    detect_dispute_or_utr,
    evaluate_stop_rule,
    parse_conversational_ptp,
    verify_translation_integrity,
)

from .services.language_utils import (
    translate_message,
)

from .services.pdf_generator import (
    build_pdf_report,
)

from .services.razorpay_utils import (
    create_razorpay_payment_link,
)

from .services.voice_utils import (
    synthesize_regional_voice_note_cached,
)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="RazorRescue AI Service",
    version="2.3.0",
    description=(
        "AI service for RazorRescue revenue recovery, "
        "customer communication, regional voice generation, "
        "PTP analysis, compliance checks, payment-link "
        "generation, and executive audit reporting."
    ),
)


# ============================================================
# CORS
# ============================================================

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    ),
)

allowed_origins = [
    origin.strip()
    for origin in frontend_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class RecoveryRequest(BaseModel):
    transaction: dict[str, Any]

    target_lang: str = "Hinglish"

    is_suppressed: bool = False

    force_dispatch: bool = False

    force_approve: bool = False

    simulated_hour: int | None = Field(
        default=None,
        ge=0,
        le=23,
    )


class TextRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
    )


class ReportRequest(BaseModel):
    audits: list[dict[str, Any]] = Field(
        default_factory=list,
    )

    total_lost: float = Field(
        default=0,
        ge=0,
    )

    total_recovered: float = Field(
        default=0,
        ge=0,
    )

    penalties_saved: float = Field(
        default=0,
        ge=0,
    )


class VoiceRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=4000,
    )

    target_lang: str = "Hinglish"


class CommunicationRequest(BaseModel):
    transaction: dict[str, Any]

    target_lang: str = "Hinglish"

    effective_amount: float | None = Field(
        default=None,
        ge=0,
    )

    decision: dict[str, Any] = Field(
        default_factory=dict,
    )

    failure_reason: str = ""

    phone: str = ""


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "razorrescue-ai",
        "status": "ok",
        "version": app.version,
        "message": (
            "AI service is running. "
            "See /docs for API documentation."
        ),
        "endpoints": {
            "health": "/health",
            "recovery": "/recovery/run",
            "communication": "/recovery/communication",
            "ptp": "/ptp/analyze",
            "voice": "/voice/synthesize",
            "compliance": "/compliance/evaluate",
            "report": "/report",
        },
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "razorrescue-ai",
        "status": "healthy",
        "version": app.version,
    }


# ============================================================
# RECOVERY PIPELINE
# ============================================================

@app.post("/recovery/run")
def recovery(
    req: RecoveryRequest,
) -> dict[str, Any]:

    if not req.transaction:
        raise HTTPException(
            status_code=400,
            detail="Transaction data is required.",
        )

    try:
        result = run_recovery_pipeline(
            req.transaction,
            req.target_lang,
            req.is_suppressed,
            req.force_dispatch,
            req.force_approve,
            req.simulated_hour,
        )

        if result is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Recovery pipeline returned no result."
                ),
            )

        if not isinstance(result, dict):
            raise HTTPException(
                status_code=500,
                detail=(
                    "Recovery pipeline returned "
                    "an invalid response."
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Recovery pipeline failed: {exc}"
            ),
        ) from exc


# ============================================================
# CUSTOMER COMMUNICATION REGENERATION
# ============================================================

@app.post("/recovery/communication")
def recovery_communication(
    req: CommunicationRequest,
) -> dict[str, Any]:

    transaction = req.transaction

    if not transaction.get("transaction_id"):
        raise HTTPException(
            status_code=400,
            detail="transaction is required.",
        )

    # --------------------------------------------------------
    # Normalize phone
    # --------------------------------------------------------

    normalized_phone = (
        str(
            req.phone
            or transaction.get("phone", "")
        )
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    normalized_phone = "".join(
        character
        for character in normalized_phone
        if character.isdigit()
    )

    if len(normalized_phone) < 10:
        raise HTTPException(
            status_code=400,
            detail=(
                "A valid 10-digit phone number "
                "is required."
            ),
        )

    normalized_phone = (
        normalized_phone[-10:]
    )

    # --------------------------------------------------------
    # Effective amount
    # --------------------------------------------------------

    amount = (
        req.effective_amount
        if req.effective_amount is not None
        else transaction.get("amount", 0)
    )

    try:
        amount = float(amount or 0)
    except (TypeError, ValueError):
        amount = 0.0

    # --------------------------------------------------------
    # Failure reason
    # --------------------------------------------------------

    failure_reason = (
        req.failure_reason
        or transaction.get(
            "failure_reason",
            "",
        )
    )

    # --------------------------------------------------------
    # Decision
    # --------------------------------------------------------

    decision = (
        req.decision
        if isinstance(req.decision, dict)
        else {}
    )

    action = decision.get(
        "action",
        "Complete payment",
    )

    explanation = decision.get(
        "explanation",
        "",
    )

    # --------------------------------------------------------
    # Generate base message
    # --------------------------------------------------------

    try:
        base_message = (
            generate_ai_recovery_message(
                transaction.get(
                    "name",
                    "Customer",
                ),
                amount,
                failure_reason,
                action,
                explanation,
            )
        )
    except Exception:
        base_message = (
            f"Hello "
            f"{transaction.get('name', 'Customer')}, "
            f"your payment of Rs. "
            f"{amount:,.2f} requires attention. "
            f"Please complete it using the payment link: "
            f"[PAYMENT_LINK]"
        )

    # --------------------------------------------------------
    # Translate / localize
    # --------------------------------------------------------

    try:
        translated_message = (
            translate_message(
                base_message,
                req.target_lang,
            )
        )
    except Exception:
        translated_message = base_message

    # --------------------------------------------------------
    # Translation integrity
    # --------------------------------------------------------

    try:
        verified_message = (
            verify_translation_integrity(
                base_message,
                translated_message,
                amount,
            )
        )
    except Exception:
        verified_message = (
            translated_message
            or base_message
        )

    # --------------------------------------------------------
    # Payment link
    # --------------------------------------------------------

    retry_url = (
        create_razorpay_payment_link(
            amount,
            transaction.get(
                "name",
                "Customer",
            ),
            normalized_phone,
            transaction.get(
                "transaction_id",
            ),
        )
    )

    # --------------------------------------------------------
    # Customer-facing message
    # --------------------------------------------------------

    final_message = (
        verified_message
        .replace(
            "[PAYMENT_LINK]",
            retry_url,
        )
    )

    # --------------------------------------------------------
    # Spoken version
    # --------------------------------------------------------

    spoken_message = (
        verified_message
        .replace(
            "[PAYMENT_LINK]",
            "diye gaye payment link par",
        )
        .strip()
    )

    return {
        "ok": True,

        "final_message":
            final_message,

        "spoken_message":
            spoken_message,

        "retry_url":
            retry_url,

        "target_language":
            req.target_lang,

        "phone":
            normalized_phone,

        "effective_amount":
            amount,
    }


# ============================================================
# PROMISE-TO-PAY / DISPUTE ANALYSIS
# ============================================================

@app.post("/ptp/analyze")
def ptp(
    req: TextRequest,
) -> dict[str, Any]:

    text = req.text.strip()

    try:
        dispute = detect_dispute_or_utr(
            text
        )

        if dispute.get("is_dispute"):
            return {
                "ok": True,
                "result": {
                    **dispute,
                    "status":
                        "DISPUTE_HOLD",
                },
            }

        parsed = parse_conversational_ptp(
            text
        )

        return {
            "ok": True,
            "result": {
                **parsed,
                "status": (
                    "PTP_COMMITMENT"
                    if parsed.get(
                        "has_commitment"
                    )
                    else "NORMAL_FLOW"
                ),
            },
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"PTP analysis failed: {exc}"
            ),
        ) from exc


# ============================================================
# REGIONAL VOICE
# ============================================================

@app.post("/voice/synthesize")
def voice(
    req: VoiceRequest,
) -> dict[str, Any]:

    text = req.text.strip()

    language = (
        req.target_lang.strip()
        or "Hinglish"
    )

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Voice text is required.",
        )

    try:
        audio = (
            synthesize_regional_voice_note_cached(
                text,
                language,
            )
        )

        if not audio:
            return {
                "ok": False,
                "audio_base64": None,
                "mime_type":
                    "audio/mpeg",
                "target_lang":
                    language,
                "message": (
                    "Voice generation failed. "
                    "Check Sarvam credentials "
                    "or the gTTS fallback."
                ),
            }

        return {
            "ok": True,

            "audio_base64":
                base64.b64encode(
                    audio
                ).decode("ascii"),

            "mime_type":
                "audio/mpeg",

            "target_lang":
                language,

            "message": (
                f"{language} voice "
                "generated successfully."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Voice generation failed: {exc}"
            ),
        ) from exc


# ============================================================
# COMPLIANCE
# ============================================================

@app.post("/compliance/evaluate")
def compliance(
    req: TextRequest,
) -> dict[str, Any]:

    text = req.text.strip()

    try:
        is_opt_out, reason = (
            evaluate_stop_rule(
                text
            )
        )

        return {
            "ok": True,
            "is_opt_out":
                bool(is_opt_out),
            "reason":
                reason,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Compliance evaluation failed: "
                f"{exc}"
            ),
        ) from exc


# ============================================================
# PDF REPORT
# ============================================================

@app.post("/report")
def report(
    req: ReportRequest,
) -> Response:

    output_path = os.path.join(
        tempfile.gettempdir(),
        "RazorRescue_Executive_Audit.pdf",
    )

    try:
        build_pdf_report(
            req.audits,
            req.total_lost,
            req.total_recovered,
            req.penalties_saved,
            output_path,
        )

        if not os.path.exists(
            output_path
        ):
            raise HTTPException(
                status_code=500,
                detail=(
                    "PDF report was not generated."
                ),
            )

        with open(
            output_path,
            "rb",
        ) as file:
            data = file.read()

        return Response(
            content=data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    'attachment; '
                    'filename="RazorRescue_Executive_Audit.pdf"'
                )
            },
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Report generation failed: {exc}"
            ),
        ) from exc