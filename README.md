# RazorRescue

## AI Revenue Recovery Operations Platform

RazorRescue is a full-stack AI revenue-recovery platform that helps merchants detect revenue at risk, diagnose payment failures, choose bounded recovery actions, communicate with customers, and maintain an auditable recovery trail.

### Core Loop

> **Detect → Diagnose → Decide → Communicate → Recover → Audit**

The platform covers failed payments, authentication failures, expired cards, checkout abandonment, insufficient funds, overdue receivables, promise-to-pay commitments, compliance suppression, recovery links, regional voice, batch recovery, and ROI analysis.

---

## Key Features

### Executive Recovery Dashboard
- Revenue at risk and recovered
- Recovery yield
- Penalties saved
- Revenue leakage analysis
- Recovery trend charts
- Live transaction stream

### AI Triage Studio
- Transaction-level diagnosis and root-cause analysis
- Bounded intervention selection
- Quiet-hour and HITL safety gates
- Multilingual customer communication
- Regional voice generation
- WhatsApp recovery draft
- Payment/retry URL
- QR-based payment recovery
- Dynamic customer phone number

### Batch Recovery
- Process multiple failed transactions
- Recovery outcome tracking
- Monte Carlo analysis
- Naive vs RazorRescue benchmarking
- HITL and suppression handling
- Penalty/bounce-fee savings analysis

### Promise-to-Pay
- PTP commitment detection
- UTR identification
- Dispute detection
- Conversational payment-intent analysis

### Compliance
- Stop-rule evaluation
- Opt-out detection
- Persistent do-not-contact registry
- Recovery blocking for suppressed customers

### Audit Ledger
- Persistent recovery history
- Transaction-level audit records
- Confidence and intervention tracking
- Read-only SQL analytics
- Executive PDF export

### ROI Calculator
- Monthly revenue at risk
- Monthly recovery opportunity
- Annual revenue at risk
- Annual recovery opportunity

---

## Architecture

![Architecture_Img](RazorRescue_Modern_WarmTheme_Final/RazorRescue_Final/frontend/src/assets/RazorRescue_Architecture.jpg)

### Responsibilities

**Frontend**
- Merchant workspace UI
- Routing and responsive layouts
- Charts and visualizations
- Animations and smooth scrolling
- QR rendering
- Audio playback
- Notifications/toasts

**Node.js / Express**
- REST API
- Transaction and dashboard data
- Recovery orchestration
- Compliance and suppression
- Audit operations
- Analytics and ROI
- Communication with the AI service

**Python / FastAPI**
- LangGraph recovery workflow
- Recovery decision logic
- Customer-message generation
- Localization
- PTP analysis
- Compliance evaluation
- Voice synthesis
- Razorpay payment-link generation
- PDF reporting

**SQLite**
- Persistent recovery/audit records
- Compliance suppression records
- Local transaction/recovery data

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Chart.js / react-chartjs-2
- GSAP
- Lenis
- React Toastify
- Lucide React
- qrcode.react

### Backend
- Node.js 22+
- Express
- REST API
- SQLite via Node's built-in `node:sqlite`
- Repository/service architecture

### AI Service
- Python 3.11+
- FastAPI
- LangGraph
- Groq
- `deep-translator`
- Sarvam integration
- gTTS fallback
- Razorpay integration
- FPDF/FPDF2

---

## Project Structure

```text
RazorRescue_Final/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── charts/
│       │   ├── layout/
│       │   └── ui/
│       ├── hooks/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Dashboard.jsx
│       │   ├── TriageStudio.jsx
│       │   ├── BatchRecovery.jsx
│       │   ├── PromiseToPay.jsx
│       │   ├── Compliance.jsx
│       │   ├── AuditLedger.jsx
│       │   ├── ROICalculator.jsx
│       │   └── RecoveryDemo.jsx
│       ├── services/
│       │   └── api.js
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── database/
│       ├── integrations/
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       ├── app.js
│       └── server.js
│
├── ai-service/
│   └── app/
│       ├── agents/
│       │   └── graph_agent.py
│       ├── models/
│       ├── routes/
│       ├── services/
│       │   ├── ai_messenger.py
│       │   ├── core_logic.py
│       │   ├── language_utils.py
│       │   ├── pdf_generator.py
│       │   ├── razorpay_utils.py
│       │   └── voice_utils.py
│       └── main.py
│
├── data/
│   ├── failed_payments.csv
│   └── recovery_ledger.db
│
└── scripts/
    ├── start_ai_windows.bat
    ├── start_backend_windows.bat
    └── start_frontend_windows.bat
```

---

## Data

### Failed-payment dataset

```text
data/failed_payments.csv
```

Provides transaction-level inputs used by the dashboard and recovery workflows.

### Recovery audit ledger

```text
data/recovery_ledger.db
```

Stores persistent recovery and audit events used by the dashboard, Audit Ledger, and reporting workflows.

The existing SQLite database is retained in the current architecture.

---

## Local Setup

### Prerequisites

Install the following:

- Node.js 22+
- npm
- Python 3.11+
- Git
- Modern web browser

Use three terminals for local development.

### 1. AI Service

#### Windows Command Prompt

```cmd
cd ai-service
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8001
```

#### Windows PowerShell

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8001
```

AI service:

```text
http://localhost:8001/
```

API documentation:

```text
http://localhost:8001/docs
```

### 2. Backend

```cmd
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend:

```text
http://localhost:4000/
```

Health check:

```text
http://localhost:4000/api/health
```

### 3. Frontend

```cmd
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173/
```

---

## Environment Variables

### AI Service

Create:

```text
ai-service/.env
```

Example:

```env
GROQ_API_KEY=your_groq_api_key
SARVAM_API_KEY=your_sarvam_api_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

### Frontend

Create:

```text
frontend/.env
```

Example:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Keep credentials server-side. Never commit `.env` files or API keys.

---

## Application Routes

| Route | Purpose |
|---|---|
| `/` | Product landing page |
| `/dashboard` | Executive recovery dashboard |
| `/triage` | Single-customer AI triage and recovery |
| `/batch-recovery` | Batch recovery and analysis |
| `/promise-to-pay` | PTP and dispute analysis |
| `/compliance` | Compliance and suppression controls |
| `/audit-ledger` | Audit history, SQL analytics and PDF export |
| `/roi-calculator` | Recovery ROI analysis |
| `/recovery-demo/:transactionId` | Local/demo recovery payment destination |

---

## Recovery Workflow

![alt text](RazorRescue_Modern_WarmTheme_Final/RazorRescue_Final/frontend/src/assets/RazorRescue_Recovery_Workflow.png)

Communication and payment previews do not bypass the final safety gate. Suppression, quiet-hour, and HITL rules remain enforced before dispatch.

---

## Multilingual & Voice Recovery

Supported languages:

- Hinglish
- Hindi
- Tamil
- Telugu
- Marathi
- Gujarati
- Punjabi
- Bengali
- Kannada
- English

The selected language controls customer-message localization and regional voice generation.

Voice generation uses Sarvam when configured and can fall back to gTTS for development/demo use.

---

## Payment, QR & WhatsApp

### Payment Recovery

The server can generate a Razorpay test payment link through the Razorpay integration.

### QR Recovery

The generated recovery URL is rendered as a QR code in Triage Studio.

### WhatsApp

The system generates a WhatsApp draft URL containing the customer message and phone number.

The browser opens WhatsApp with the message prefilled; the application does not attempt to programmatically paste into WhatsApp.

A separate copy-draft action is available.

---

## Responsive Design

The UI follows a mobile-first approach and adapts to:

- Mobile
- Tablet
- Laptop
- Desktop

Responsive behavior covers navigation, headers, metric cards, recovery forms, charts, QR layouts, audit tables, and SQL analytics.

The Audit Ledger keeps horizontal and vertical scrolling inside the audit-history panel with a custom themed scrollbar.

---

## API Surface

### AI Service

```text
GET  /
GET  /health

POST /recovery/run
POST /recovery/communication
POST /ptp/analyze
POST /voice/synthesize
POST /compliance/evaluate
POST /report
```

---

## Safety & Governance

RazorRescue is designed as a bounded recovery system rather than unrestricted automation.

Key controls include:

- Customer opt-out suppression
- Quiet-hour handling
- HITL approval
- Confidence-based decisions
- Read-only analytics
- Persistent audit history
- Server-side payment credentials
- Separation between preview and dispatch

The system is intended as a controlled merchant-operations workflow and should use test credentials and demo payment flows during development.

---

## Windows Helper Scripts

The repository includes:

```text
scripts/start_ai_windows.bat
scripts/start_backend_windows.bat
scripts/start_frontend_windows.bat
```

These scripts simplify local Windows startup by using the correct working directories and commands.

---

## Development Flow

Start the services in this order:

```text
AI Service   :8001
     ↓
Backend      :4000
     ↓
Frontend     :5173
```

Verify:

```text
http://localhost:8001/
http://localhost:4000/api/health
http://localhost:5173/
```

---

## Real-World Implementation

RazorRescue is designed around a realistic merchant revenue-recovery workflow rather than a standalone AI demonstration.

A production implementation could connect the platform to:

- Payment gateway transaction events
- Merchant transaction databases
- Customer communication systems
- Payment/retry links
- Voice and messaging providers
- Compliance and suppression registries
- Finance and reporting systems

The current project uses a local SQLite audit/data layer and test/demo integrations. A production deployment would require secure authentication, authorization, encrypted secrets, production-grade databases, provider-specific compliance reviews, monitoring, rate limits, audit controls, and formal testing before handling real customer or payment data.

---

## License

This project is intended for buildathon, demonstration, and development purposes.

Do not use the demo configuration or test integrations for production financial operations. Before any real-world deployment, replace demo credentials and services with appropriately secured production infrastructure and complete the required security, compliance, privacy, and payment-provider reviews.

