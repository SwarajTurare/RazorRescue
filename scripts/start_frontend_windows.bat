@echo off
cd /d "%~dp0..\frontend"
if not exist ".env" copy .env.example .env >nul
if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
)
npm run dev
pause
