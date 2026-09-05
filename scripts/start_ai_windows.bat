@echo off
cd /d "%~dp0..\ai-service"
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment with your installed Python...
  py -m venv .venv
)
call .venv\Scripts\activate.bat
if not exist ".env" copy .env.example .env >nul
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
pause
