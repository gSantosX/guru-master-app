@echo off
title GURU MASTER
color 0b

if not exist "bin\electron\electron.exe" (
    echo [!] Erro: Sistema nao configurado. 
    echo [!] Por favor, execute 'INSTALAR_GURU_MASTER.bat' primeiro para baixar os componentes.
    pause
    exit
)

echo [ Guru Master ] Iniciando Motores...

rem Limpeza de segurança
taskkill /F /IM electron.exe /IM python.exe 2>nul

rem Iniciar Backend e Frontend em paralelo
start /b "" "bin\python\python.exe" "backend\api.py"
start "" "bin\electron\electron.exe" .

exit
