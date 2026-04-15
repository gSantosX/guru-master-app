@echo off
title GURU MASTER - Instalador de Elite
color 0d
echo ==========================================
echo    GURU MASTER - INSTALADOR INTELIGENTE
echo ==========================================
echo.
echo Iniciando protocolo de configuracao automatica...
echo [!] Dependendo da sua internet, isso pode levar alguns minutos.
echo.

powershell -ExecutionPolicy Bypass -File "setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [!] HOUVE UM ERRO NA INSTALACAO. 
    echo [!] Verifique sua conexao com a internet e tente rodar como Administrador.
    pause
    exit
)

echo.
echo [ OK ] Tudo pronto! Use o 'GURU_MASTER.bat' ou o atalho no Desktop para iniciar.
pause
exit
