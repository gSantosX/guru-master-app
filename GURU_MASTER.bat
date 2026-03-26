@echo off
rem Limpeza de segurança para evitar conflitos de porta
taskkill /F /IM electron.exe /IM node.exe /IM python.exe /T 2>nul
start "" wscript "start_guru_silent.vbs"
exit
