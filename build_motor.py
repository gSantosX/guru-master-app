import os
import zipfile
import shutil

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), 'public')
ZIP_PATH = os.path.join(PUBLIC_DIR, 'guru-render-motor.zip')

print(f"Building {ZIP_PATH}...")

if not os.path.exists(PUBLIC_DIR):
    os.makedirs(PUBLIC_DIR)

# Text of the instructions file
COMO_INSTALAR = """=============== GURU MASTER - MOTOR DE RENDERIZACAO ===============

Ola, Master! 
Este e o Motor de Renderizacao Local. Ele conectara a sua maquina
diretamente com a interface web do Guru Master, permitindo que a
sua placa de video e processador renderizem os videos rapidamente, 
sem depender de nuvem paga.

--- COMO INSTALAR E RODAR ---

1. Extraia TODO ESTE PACOTE (ZIP) para uma pasta no seu computador.
   (Nao rode os arquivos diretamente de dentro do ZIP).

2. De dois cliques no arquivo:
   START_MOTOR.bat

3. Aguarde. Se voce nao tiver o Python instalado, ele vai avisar.
   Ele vai instalar automaticamente o motor invisivel na porta 5000.

4. Uma telinha preta ficara aberta (esse e o SEU motor local).
   Deixe-a aberta enquanto estiver usando o Guru Master para 
   renderizar seus conteudos!

--- O QUE ELE FAZ MAGICAMENTE? ---
- Baixa o FFmpeg (O rei da edicao automatizada de video via codigo).
- Instala o Python e as bibliotecas (Moviepy, Flask, etc).
- Fica aguardando silenciosamente as ordens do Guru Master.

Bom trabalho e escalas explosivas!
"""

# Text of the batch script
START_MOTOR = """@echo off
title Guru Master - Motor de Renderizacao Local
color 0b
echo ========================================================
echo        GURU MASTER - MOTOR DE RENDERIZACAO
echo ========================================================
echo.
echo Inicializando conexao entre o Site e a sua Maquina...

:: Verifica se Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Python nao foi encontrado no sistema.
    echo Por favor, instale o Python a partir da Microsoft Store ou python.org
    echo E MARQUE A CAIXINHA "Add Python to PATH" durante a instalacao!
    pause
    exit /b
)

:: Verifica FFmpeg (basico)
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] FFmpeg nao encontrado no PATH.
    echo O motor tentara instalar o FFmpeg usando o Winget...
    winget install ffmpeg --silent
)

echo [OK] Ambiente checado. Instalando/Atualizando dependencias (isso pode demorar 1 min)...
pip install -r backend/requirements.txt --disable-pip-version-check -q

echo.
echo ========================================================
echo [OK] MOTOR PRONTO E CONECTADO! STATUS: ONLINE (Porta 5000)
echo ========================================================
echo V0.1 Auto-Flow Engine
echo.
echo [ATENCAO] Mantenha esta janela aberta enquanto renderiza.
echo Pode voltar para o site do Guru Master e clicar em "Gerar Video".
echo.

python backend/api.py
pause
"""

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # 1. Add COMO_INSTALAR.txt
    zipf.writestr('COMO_INSTALAR.txt', COMO_INSTALAR)
    
    # 2. Add START_MOTOR.bat
    zipf.writestr('START_MOTOR.bat', START_MOTOR)
    
    # 3. Add Backend Files
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if os.path.exists(backend_dir):
        for file in ['api.py', 'ffmpeg_utils.py', 'requirements.txt']:
            file_path = os.path.join(backend_dir, file)
            if os.path.exists(file_path):
                zipf.write(file_path, arcname=f'backend/{file}')
                print(f"Added backend/{file}")
            else:
                print(f"Warning: {file} not found in backend directory.")
    else:
        print("Warning: Backend directory not found!")
        
print("Build complete!")
