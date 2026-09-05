@echo off
cd /d "%~dp0..\backend"
if not exist ".env" copy .env.example .env >nul
echo.
echo RazorRescue backend requires Node.js 22 or newer.
node -v
echo.
if not exist "node_modules" (
  echo Installing Node dependencies...
  call npm install
)
npm run dev
pause
