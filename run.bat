@echo off
echo Starting FastAPI Backend...
start cmd /k "cd gst-hackathon-project\gst-api && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8005"

echo Starting Vite React Frontend...
timeout /t 3 /nobreak > nul
start cmd /k "cd gst-hackathon-project\frontend && npm run dev"

echo Both services started!
