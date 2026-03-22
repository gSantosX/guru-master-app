@echo off
echo Starting GURU MASTER Services...
set PROJECT_DIR=C:\Users\ASUS\.gemini\antigravity\scratch\guru-master-app
cd %PROJECT_DIR%

echo [1/2] Launching Backend (Flask)...
start /B "" python backend/api.py

echo [2/2] Launching Frontend (Vite)...
start /B "" powershell -ExecutionPolicy Bypass -Command "npm run dev"

echo Services are running. Opening browser...
timeout /t 5
start http://localhost:5173
