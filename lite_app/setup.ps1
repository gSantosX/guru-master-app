$ErrorActionPreference = "Stop"

function Write-Neon($msg, $color="Cyan") {
    Write-Host "[ Guru Master ] " -NoNewline -ForegroundColor Magenta
    Write-Host $msg -ForegroundColor $color
}

Write-Neon "INICIANDO PROTOCOLO DE INSTALACAO ZERO-CONFIG..." "Yellow"
Write-Neon "Verificando integridade do sistema operacional..." "Cyan"

$root = "$PSScriptRoot"
$binDir = Join-Path $root "bin"
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir }

# --- PYTHON BATTLE ---
$pythonDir = Join-Path $binDir "python"
if (!(Test-Path $pythonDir)) {
    Write-Neon "[!] Python local nao encontrado. Baixando Motor Cerebral (3.11 Embed)..." "Yellow"
    $pythonUrl = "https://www.python.org/ftp/python/3.11.0/python-3.11.0-embed-amd64.zip"
    $pythonZip = Join-Path $binDir "python.zip"
    Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonZip
    Write-Neon "[+] Extraindo Python..." "Cyan"
    Expand-Archive -Path $pythonZip -DestinationPath $pythonDir -Force
    Remove-Item $pythonZip -Force
    
    # Configure Python Embeddable (pth file to include site-packages)
    $pthFile = Join-Path $pythonDir "python311._pth"
    Add-Content -Path $pthFile -Value "import site"
} else {
    Write-Neon "[+] Motor Cerebral detectado." "Green"
}

# --- FFMPEG BATTLE ---
$ffmpegDir = Join-Path $binDir "ffmpeg"
if (!(Test-Path $ffmpegDir)) {
    Write-Neon "[!] Motor de Video (FFmpeg) nao encontrado. Baixando..." "Yellow"
    $ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $ffmpegZip = Join-Path $binDir "ffmpeg.zip"
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $ffmpegZip
    Write-Neon "[+] Extraindo FFmpeg..." "Cyan"
    Expand-Archive -Path $ffmpegZip -DestinationPath $ffmpegDir -Force
    # Move files from subfolder if needed
    $subDir = Get-ChildItem -Path $ffmpegDir -Directory | Select-Object -First 1
    if ($subDir) {
        Copy-Item -Path "$($subDir.FullName)\*" -Destination $ffmpegDir -Recurse -Force
        Remove-Item $subDir.FullName -Recurse -Force
    }
    Remove-Item $ffmpegZip -Force
} else {
    Write-Neon "[+] Motor de Video detectado." "Green"
}

# --- ELECTRON BATTLE ---
$electronDir = Join-Path $binDir "electron"
if (!(Test-Path $electronDir)) {
    Write-Neon "[!] Shell de Interface (Electron) nao encontrado. Baixando..." "Yellow"
    $electronUrl = "https://github.com/electron/electron/releases/download/v31.0.0/electron-v31.0.0-win32-x64.zip"
    $electronZip = Join-Path $binDir "electron.zip"
    Invoke-WebRequest -Uri $electronUrl -OutFile $electronZip
    Write-Neon "[+] Extraindo Shell..." "Cyan"
    Expand-Archive -Path $electronZip -DestinationPath $electronDir -Force
    Remove-Item $electronZip -Force
} else {
    Write-Neon "[+] Shell de Interface detectado." "Green"
}

# --- PIP & DEPENDENCIES ---
Write-Neon "Sincronizando bibliotecas de IA..." "Yellow"
$pythonExe = Join-Path $pythonDir "python.exe"

# Install pip for embeddable python if missing
if (!(Test-Path (Join-Path $pythonDir "Scripts\pip.exe"))) {
    Write-Neon "[!] Instalando Gerenciador de Pacotes PIP..." "Cyan"
    $get_pip = Join-Path $binDir "get-pip.py"
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $get_pip
    & $pythonExe $get_pip
    Remove-Item $get_pip -Force
}

$pipExe = Join-Path $pythonDir "Scripts\pip.exe"
$reqFile = Join-Path $root "backend\requirements.txt"
& $pipExe install -r $reqFile --no-warn-script-location

# --- CONFIG UPDATE BATTLE ---
Write-Neon "Calibrando sensores do sistema (config.json)..." "Yellow"
$configFile = Join-Path $root "backend\config.json"
if (Test-Path $configFile) {
    $config = Get-Content $configFile | ConvertFrom-Json
    $config.ffmpeg_path = [System.IO.Path]::GetFullPath((Join-Path $binDir "ffmpeg\bin\ffmpeg.exe"))
    $config.ffprobe_path = [System.IO.Path]::GetFullPath((Join-Path $binDir "ffmpeg\bin\ffprobe.exe"))
    $config | ConvertTo-Json | Set-Content $configFile
}

# --- SHORTCUT BATTLE ---
Write-Neon "Materializando atalho no Desktop..." "Yellow"
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), "Guru Master.lnk")
$Shortcut = $WshShell.CreateShortcut($DesktopPath)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"`"$root\GURU_MASTER.bat`"`""
$Shortcut.WorkingDirectory = "$root"
$Shortcut.IconLocation = "$root\icon.ico"
$Shortcut.Description = "Guru Master - AI Video Pipeline"
$Shortcut.Save()

Write-Neon "==========================================" "Magenta"
Write-Neon "   PROTOCOLO CONCLUIDO COM SUCESSO!   " "Green"
Write-Neon "==========================================" "Magenta"
Write-Neon "Pressione qualquer tecla para encerrar..." "Cyan"
