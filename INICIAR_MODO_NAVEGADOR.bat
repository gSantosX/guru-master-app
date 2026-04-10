@echo off
title GURU MASTER - Iniciando Servicos (Modo Browser)
cls
echo ======================================================
echo    GURU MASTER - INICIANDO MOTOR E INTERFACE
echo ======================================================
echo.
echo [*] Encerrando processos antigos...
taskkill /F /IM node.exe /IM python.exe /T 2>nul

echo [*] Iniciando Motor Backend (Porta 5000)...
start /min "" "backend\venv\Scripts\python.exe" "backend\api.py"

echo [*] Iniciando Interface Web (Porta 5173)...
start /min "" cmd /c "npm run dev"

echo.
echo [!] AGUARDE 5 SEGUNDOS...
timeout /t 5 /nobreak >nul

echo [!] ABRINDO NAVEGADOR...
start http://localhost:5173

echo.
echo ======================================================
echo    TUDO PRONTO! 
echo    Voce pode fechar esta janela preta.
echo    Os servicos continuarao rodando em segundo plano.
echo ======================================================
pause
