@echo off
setlocal

echo Starting FastAPI Backend...
start cmd /k "cd /d %~dp0gst-api && uvicorn main:app --reload --host 0.0.0.0 --port 8010"

if not exist "%~dp0frontend\node_modules" (
  echo Installing React frontend dependencies...
  call cmd /c "cd /d %~dp0frontend && npm install"
)

echo Starting React Frontend...
timeout /t 3 /nobreak > nul
start cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0 --port 5173"

echo Services started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8010
