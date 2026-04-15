@echo off
title GURU MASTER - Instalador Inteligente
color 0b
echo ==========================================
echo    GURU MASTER - PREPARANDO AMBIENTE
echo ==========================================
echo.
echo Verificando requisitos do sistema...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python nao encontrado. Baixando instalador...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe' -OutFile 'python_setup.exe'"
    echo [!] Por favor, instale o Python manualmente e MARQUE A OPCAO 'Add Python to PATH'.
    start python_setup.exe
    pause
    exit
)

echo [+] Criando Cérebro Local (Venv)...
python -m venv backend\venv

echo [+] Injetando Dependencias de IA...
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt

echo [+] Criando Atalho na Area de Trabalho...
powershell -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Guru Master.lnk')); $s.TargetPath='cmd.exe'; $s.Arguments='/c \"\"' + [System.IO.Path]::GetFullPath('GURU_MASTER.bat') + '\"\"'; $s.WorkingDirectory=[System.IO.Path]::GetFullPath('.'); $s.IconLocation=[System.IO.Path]::GetFullPath('icon.ico'); $s.Save()"

echo.
echo ==========================================
echo    INSTALACAO CONCLUIDA COM SUCESSO!
echo    Um atalho foi criado na sua Area de Trabalho.
echo ==========================================
pause
