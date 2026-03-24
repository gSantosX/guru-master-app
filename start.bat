@echo off
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"
set ELECTRON_RUN_AS_NODE=
npm run electron:dev
