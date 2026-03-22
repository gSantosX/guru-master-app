@echo off
echo Starting GURU MASTER Services...

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [0/2] Limpando processos antigos nas portas 5000 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 :5173" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
ping -n 2 127.0.0.1 >nul

echo [1/2] Iniciando Backend (Flask)...
start /B "" "C:\Users\gusta\AppData\Local\Programs\Python\Python312\python.exe" backend/api.py

ping -n 4 127.0.0.1 >nul

echo [2/2] Iniciando Frontend (Vite)...
start /B "" powershell -ExecutionPolicy Bypass -Command "npm run dev"

echo Servicos iniciados! Abrindo o navegador...
timeout /t 5 >nul
start http://localhost:5173
