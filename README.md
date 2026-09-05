# RazorRescue 2.0 — Modern Full-Stack Architecture

RazorRescue is an AI revenue-recovery operations platform for detecting failed/revenue-at-risk payments, selecting bounded interventions, protecting customers with compliance gates, and recording measurable recovery outcomes.

## Architecture

```text
React + Vite + Tailwind + Chart.js + GSAP + Lenis
                    │
                  REST
                    ▼
          Node.js + Express API
          ┌─────────┴─────────┐
          ▼                   ▼
       SQLite            Python FastAPI
      audit/data         LangGraph + Groq
                           PTP / voice / i18n
```

The migration preserves the original Python recovery decision engine and LangGraph workflow rather than replacing it with a mock frontend.

## Stack

### Frontend
- React + Vite + JavaScript
- Tailwind CSS
- React Router
- Chart.js / react-chartjs-2
- GSAP
- Lenis
- React Toastify
- Lucide React

### Backend
- Node.js + Express
- SQLite via Node built-in `node:sqlite`
- REST JSON API
- Read-only validated audit query endpoint

### AI service
- Python + FastAPI
- LangGraph
- Groq
- deep-translator
- Sarvam/gTTS integration preserved
- Razorpay integration preserved
- FPDF2

## Data

- `data/failed_payments.csv` — existing failed-payment dataset
- `data/recovery_ledger.db` — existing SQLite audit ledger, retained

## Running locally

### 1. AI service

```bash
cd ai-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Windows CMD: copy .env.example .env
# PowerShell: Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8001
```

### 2. Backend

```bash
cd backend
npm install
Windows CMD: copy .env.example .env
# PowerShell: Copy-Item .env.example .env
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

Private credentials belong only in `ai-service/.env`:

- `GROQ_API_KEY`
- `SARVAM_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Backend configuration lives in `backend/.env`.

Frontend may optionally use `frontend/.env` with `VITE_API_BASE_URL=http://localhost:4000/api`.

## Routes

- `/` — product home / kinetic visual landing page
- `/dashboard` — executive recovery dashboard
- `/triage` — single-customer AI triage studio
- `/batch-recovery` — batch recovery orchestrator + Monte Carlo + benchmark
- `/promise-to-pay` — PTP and dispute handling
- `/compliance` — suppression and opt-out controls
- `/audit-ledger` — audit ledger, query, and PDF export
- `/roi-calculator` — merchant business-case calculator

## Moving blended background

The home page includes an original kinetic gradient system inspired by the visual idea of modern lyrics experiences: multiple blurred color fields move slowly, remain behind the content, and support optional audio-reactive scaling using the Web Audio API. No third-party Spicy Lyrics assets are copied.

The component is `frontend/src/components/layout/KineticBackground.jsx` and can be reused anywhere. Pass a ref to an HTML `<audio>` element to enable audio-reactive pulsing.

## Responsive strategy

Mobile-first layout was used throughout. The shell/navigation, metric cards, charts, forms, and data tables adapt for mobile, tablet, laptop, and large desktop resolutions. Reduced-motion preferences are respected.

## Design system

Reference palette from the supplied design direction:

- Primary blue: `#45B5E7`
- Accent magenta: `#B24D9C`
- Background: `#151517`
- White: `#FFFFFF`

The interface intentionally avoids excessive emoji, decorative noise, or copy-heavy cards. Icons use Lucide React for consistency.

## Migration mapping

| Original | Modern location |
|---|---|
| `core_logic.py` | `ai-service/app/services/core_logic.py` |
| `graph_agent.py` | `ai-service/app/agents/graph_agent.py` |
| `ai_messenger.py` | `ai-service/app/services/ai_messenger.py` |
| `language_utils.py` | `ai-service/app/services/language_utils.py` |
| `voice_utils.py` | `ai-service/app/services/voice_utils.py` |
| `razorpay_utils.py` | `ai-service/app/services/razorpay_utils.py` |
| `pdf_generator.py` | `ai-service/app/services/pdf_generator.py` |
| Streamlit views | React `frontend/src/pages/*.jsx` |
| SQLite ledger | `data/recovery_ledger.db` + Node repository/services |
| `failed_payments.csv` | `data/failed_payments.csv` |

## Safety boundary

The backend and AI service preserve the original suppression, quiet-hour, high-ticket/HITL, PTP, UTR, and audit behaviors. Payment credentials are server-side only. The SQL analytics route accepts a single SELECT statement and blocks mutation/DDL keywords.


## Windows startup

The repository also includes one-click helper scripts under `scripts/`: `start_ai_windows.bat`, `start_backend_windows.bat`, and `start_frontend_windows.bat`. These keep the correct working directory, create missing `.env` files, and install dependencies when `node_modules`/`.venv` are absent.



Use three terminals.

### AI service
```cmd
cd ai-service
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8001
```

### Backend
```cmd
cd backend
npm install
copy .env.example .env
npm run dev
```

The backend root `http://localhost:4000/` now returns a JSON health response instead of `Cannot GET /`.

### Frontend
```cmd
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:4000/api`; set `VITE_API_BASE_URL` only when using a different backend address.


### Windows / Node SQLite note

The backend uses Node's built-in `node:sqlite` module instead of `better-sqlite3`. This avoids native `better_sqlite3.node` binding errors when the installed Node ABI does not match the downloaded addon. Node 22+ is required. The existing `data/recovery_ledger.db` is used unchanged.

The React app's nested workspace routes are rendered through React Router's `Outlet`, so Dashboard/Triage/Batch/etc. are visible inside the common AppShell.
