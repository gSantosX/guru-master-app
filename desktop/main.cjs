// ============================================================
// Guru Master — main.cjs v3.0 (Zero-Config Edition)
// Auto-setup: Python detection → pip install → FFmpeg → Health check → Launch
// ============================================================

const electron    = require('electron');
const path        = require('path');
const fs          = require('fs');
const { spawn, execSync } = require('child_process');
const http        = require('http');

const {
  app, BrowserWindow, ipcMain, Tray, Menu, shell, dialog
} = electron;
const { autoUpdater } = require('electron-updater');

// ── Paths ────────────────────────────────────────────────────
const IS_PACKAGED   = app.isPackaged;
const RESOURCES_DIR = IS_PACKAGED
  ? process.resourcesPath
  : path.join(__dirname, '..');

const BACKEND_DIR   = path.join(RESOURCES_DIR, 'backend');
const BACKEND_PORT  = 5000;
const BACKEND_URL   = `http://127.0.0.1:${BACKEND_PORT}`;

// FFmpeg: prefer ffmpeg-static bundled binary
let FFMPEG_PATH  = 'ffmpeg';
let FFPROBE_PATH = 'ffprobe';
try {
  FFMPEG_PATH  = require('ffmpeg-static');
  FFPROBE_PATH = require('ffprobe-static').path;
  console.log('[Guru] FFmpeg bundled:', FFMPEG_PATH);
  console.log('[Guru] FFprobe bundled:', FFPROBE_PATH);
} catch (e) {
  console.warn('[Guru] ffmpeg-static not found, using system PATH:', e.message);
}

// ── State ────────────────────────────────────────────────────
let mainWindow    = null;
let splashWindow  = null;
let backendProcess = null;
let tray          = null;
let isQuitting    = false;
let backendOnline = false;

// ── Single Instance Lock ─────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupAutoUpdater();
    setupIpcHandlers();
    createTray();

    // Show splash while backend initializes
    createSplash();
    await startBackend();

    // Open main window after backend is ready
    createWindow();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // Keep alive in tray — do NOT quit
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    killBackend();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// ════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ════════════════════════════════════════════════════════════
function createSplash() {
  splashWindow = new BrowserWindow({
    width:  460,
    height: 520,
    frame:  false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function splashSend(data) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `window.splashUpdate && window.splashUpdate(${JSON.stringify(data)})`
    ).catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════
// PYTHON DETECTION
// ════════════════════════════════════════════════════════════
function findPython() {
  const candidates = [
    // 1. Portable Python bundled by developer (build step)
    path.join(RESOURCES_DIR, 'bin', 'python', 'python.exe'),
    // 2. Traditional venv (development)
    path.join(BACKEND_DIR, 'venv', 'Scripts', 'python.exe'),
    // 3. System Python
    'python',
    'python3',
  ];

  for (const p of candidates) {
    try {
      const result = execSync(`"${p}" --version`, { timeout: 3000, stdio: 'pipe' });
      console.log(`[Guru] Python found: ${p} → ${result.toString().trim()}`);
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════
// AUTO-INSTALL DEPENDENCIES
// ════════════════════════════════════════════════════════════
async function ensureDependencies(pythonPath) {
  splashSend({ step: 'step-deps', state: 'active', message: 'Verificando dependências Flask...' });

  // Check if flask is already available
  try {
    execSync(`"${pythonPath}" -c "import flask, flask_cors, PIL, werkzeug"`, {
      timeout: 8000, stdio: 'pipe'
    });
    splashSend({ step: 'step-deps', state: 'done', message: 'Dependências OK.' });
    return true;
  } catch {
    // Flask not installed — run pip
    console.log('[Guru] Dependencies missing. Running pip install...');
    splashSend({ step: 'step-deps', state: 'active', message: 'Instalando Flask + dependências (aguarde)...' });
  }

  const reqPath = path.join(BACKEND_DIR, 'requirements.txt');
  const pipArgs = ['-m', 'pip', 'install', '--quiet', '--no-warn-script-location',
    '-r', reqPath];

  return new Promise((resolve) => {
    const pip = spawn(pythonPath, pipArgs, {
      cwd: BACKEND_DIR,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    pip.stdout.on('data', (d) => {
      const line = d.toString().trim();
      if (line) splashSend({ message: line.substring(0, 60) });
    });

    pip.on('close', (code) => {
      if (code === 0) {
        splashSend({ step: 'step-deps', state: 'done', message: 'Dependências instaladas!' });
        resolve(true);
      } else {
        splashSend({ step: 'step-deps', state: 'error', message: 'Erro ao instalar dependências.' });
        resolve(false);
      }
    });

    pip.on('error', (e) => {
      console.error('[Guru] pip error:', e);
      splashSend({ step: 'step-deps', state: 'error', message: 'pip não encontrado.' });
      resolve(false);
    });
  });
}

// ════════════════════════════════════════════════════════════
// HEALTH CHECK POLLER
// ════════════════════════════════════════════════════════════
function waitForBackend(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start    = Date.now();
    let attempt    = 0;

    function poll() {
      attempt++;
      http.get(`${BACKEND_URL}/api/check`, (res) => {
        if (res.statusCode === 200) {
          backendOnline = true;
          resolve(true);
        } else {
          retry();
        }
        res.resume();
      }).on('error', retry);
    }

    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Backend não respondeu em ${timeoutMs / 1000}s`));
        return;
      }
      const dot = '.'.repeat((attempt % 3) + 1);
      splashSend({ message: `Aguardando motor${dot}` });
      setTimeout(poll, 600);
    }

    poll();
  });
}

// ════════════════════════════════════════════════════════════
// KILL BACKEND
// ════════════════════════════════════════════════════════════
function killBackend() {
  if (backendProcess) {
    try { backendProcess.kill('SIGTERM'); } catch {}
    backendProcess = null;
  }
  backendOnline = false;
  // Also kill any orphaned process on port 5000
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${BACKEND_PORT}') do taskkill /f /pid %a`, {
      shell: 'cmd.exe', stdio: 'ignore', timeout: 3000
    });
  } catch {}
}

// ════════════════════════════════════════════════════════════
// START BACKEND — MAIN FLOW
// ════════════════════════════════════════════════════════════
async function startBackend() {
  console.log('[Guru] Starting backend setup...');

  // ── Step 1: Kill any existing process on port 5000
  killBackend();

  // ── Step 2: Detect Python
  splashSend({ step: 'step-python', state: 'active', progress: 10, message: 'Procurando motor Python...' });
  const pythonPath = findPython();

  if (!pythonPath) {
    splashSend({ step: 'step-python', state: 'error', message: 'Python não encontrado!', error: true });
    await dialog.showMessageBox({
      type: 'error',
      title: 'Guru Master — Erro Crítico',
      message: 'Python não foi encontrado na sua máquina.\n\nPor favor, instale o Python 3.11+ em:\nhttps://www.python.org/downloads/\n\nApós instalar, reinicie o Guru Master.',
      buttons: ['Abrir python.org', 'Fechar']
    }).then(({ response }) => {
      if (response === 0) shell.openExternal('https://www.python.org/downloads/');
    });
    app.quit();
    return;
  }

  splashSend({ step: 'step-python', state: 'done', progress: 25, message: 'Python encontrado!' });

  // ── Step 3: Install dependencies
  splashSend({ progress: 30 });
  const depsOk = await ensureDependencies(pythonPath);
  if (!depsOk) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Guru Master — Aviso',
      message: 'Não foi possível instalar as dependências automaticamente.\n\nO app tentará iniciar mesmo assim. Se falhar, execute:\n\npip install flask flask-cors pillow werkzeug',
      buttons: ['Continuar mesmo assim', 'Fechar']
    });
    if (response === 1) { app.quit(); return; }
  }

  // ── Step 4: FFmpeg check
  splashSend({ step: 'step-ffmpeg', state: 'active', progress: 55, message: 'Verificando motor FFmpeg...' });
  try {
    execSync(`"${FFMPEG_PATH}" -version`, { timeout: 3000, stdio: 'pipe' });
    splashSend({ step: 'step-ffmpeg', state: 'done', message: 'FFmpeg pronto.' });
  } catch {
    splashSend({ step: 'step-ffmpeg', state: 'error', message: 'FFmpeg não encontrado — renderização limitada.' });
    console.warn('[Guru] FFmpeg not found. Videos may not render.');
  }

  // ── Step 5: Launch Flask API
  splashSend({ step: 'step-backend', state: 'active', progress: 70, message: 'Iniciando servidor local...' });

  const apiPath = path.join(BACKEND_DIR, 'api.py');
  const env = {
    ...process.env,
    GURU_FFMPEG_PATH:  FFMPEG_PATH,
    GURU_FFPROBE_PATH: FFPROBE_PATH,
    GURU_BACKEND_PORT: String(BACKEND_PORT),
    PYTHONUNBUFFERED:  '1',
  };

  backendProcess = spawn(pythonPath, [apiPath], {
    cwd: BACKEND_DIR,
    windowsHide: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) {
      console.log(`[Backend] ${line}`);
      if (line.includes('Running on')) {
        splashSend({ message: 'Servidor pronto!' });
      }
    }
  });

  backendProcess.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line && !line.includes('WARNING')) {
      console.error(`[Backend ERR] ${line}`);
    }
  });

  backendProcess.on('error', (err) => {
    console.error('[Guru] Backend spawn error:', err);
    backendOnline = false;
    if (mainWindow) mainWindow.webContents.send('backend-status', { online: false, error: err.message });
  });

  backendProcess.on('close', (code) => {
    console.warn(`[Guru] Backend exited with code: ${code}`);
    backendOnline = false;
    if (mainWindow && !isQuitting) {
      mainWindow.webContents.send('backend-status', { online: false, code });
    }
  });

  // ── Step 6: Wait for backend to respond
  splashSend({ progress: 80, message: 'Aguardando servidor...' });
  try {
    await waitForBackend(40000);
    splashSend({ step: 'step-backend', state: 'done', progress: 100, message: '✓ Guru Master pronto!' });
    console.log('[Guru] Backend is online!');
    await new Promise(r => setTimeout(r, 800)); // brief pause to show "ready"
  } catch (err) {
    splashSend({ step: 'step-backend', state: 'error', message: 'Servidor não respondeu.', error: true });
    console.error('[Guru] Backend timeout:', err);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Guru Master — Erro',
      message: `O servidor interno não iniciou a tempo.\n\nDetalhe: ${err.message}\n\nVerifique se o antivírus está bloqueando o app.`,
      buttons: ['Continuar', 'Fechar']
    }).then(({ response }) => {
      if (response === 1) app.quit();
    });
  }
}

// ════════════════════════════════════════════════════════════
// MAIN WINDOW
// ════════════════════════════════════════════════════════════
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    show: false, // show only after ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'GURU MASTER — AI Video Pipeline',
    icon: path.join(__dirname, '..', 'icon.ico'),
  });

  // Load: try Vite dev server first, fall back to dist build
  const devUrl   = `http://localhost:5173`;
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  mainWindow.loadURL(devUrl).catch(() => {
    if (fs.existsSync(prodPath)) {
      mainWindow.loadFile(prodPath);
    } else {
      console.error('[Guru] CRITICAL: No frontend found (dev server down + no dist build).');
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    // Broadcast backend status to frontend
    mainWindow.webContents.send('backend-status', { online: backendOnline });
  });

  // Hide to tray on close (don't quit)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ════════════════════════════════════════════════════════════
// SYSTEM TRAY
// ════════════════════════════════════════════════════════════
function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon.ico');
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  tray.setToolTip('GURU MASTER — AI Video Pipeline');

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Abrir Guru Master',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createWindow();
      }
    },
    { label: 'Abrir no Navegador', click: () => shell.openExternal(`http://localhost:5173`) },
    { type: 'separator' },
    {
      label: 'Reiniciar Motor Backend',
      click: async () => {
        killBackend();
        await startBackend();
        if (mainWindow) mainWindow.webContents.send('backend-status', { online: backendOnline });
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => { isQuitting = true; app.quit(); }
    }
  ]));

  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createWindow();
  });
}

// ════════════════════════════════════════════════════════════
// IPC HANDLERS
// ════════════════════════════════════════════════════════════
function setupIpcHandlers() {
  // Save video via native dialog
  ipcMain.handle('save-video', async (_event, jobId, suggestedName) => {
    try {
      const sourcePath = path.join(BACKEND_DIR, 'output', `${jobId}.mp4`);
      // Also check the result_file path from render job
      if (!fs.existsSync(sourcePath)) {
        // Try to find it in backend output folder
        const outputDir = path.join(BACKEND_DIR, 'output');
        const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4'));
        if (files.length === 0) return { success: false, error: 'Arquivo não encontrado.' };
      }
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Salvar Vídeo Renderizado',
        defaultPath: suggestedName || `guru_video_${Date.now()}.mp4`,
        filters: [{ name: 'Vídeo MP4', extensions: ['mp4'] }]
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      fs.copyFileSync(sourcePath, filePath);
      return { success: true, savedPath: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Select output folder
  ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Pasta de Saída',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || !filePaths.length) return { success: false };
    return { success: true, folderPath: filePaths[0] };
  });

  // Reveal file in Explorer
  ipcMain.handle('open-in-folder', async (_event, fullPath) => {
    if (fullPath && fs.existsSync(fullPath)) {
      shell.showItemInFolder(fullPath);
      return { success: true };
    }
    return { success: false, error: 'Arquivo não encontrado' };
  });

  // Save text file (scripts etc.)
  ipcMain.handle('save-file', async (_event, content, filename) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Documentos', extensions: ['txt', 'srt', 'pdf'] }]
    });
    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  });

  // Restart backend on demand (from UI)
  ipcMain.handle('restart-backend', async () => {
    console.log('[Guru] Manual backend restart requested.');
    killBackend();
    await startBackend();
    if (mainWindow) mainWindow.webContents.send('backend-status', { online: backendOnline });
    return { success: true, online: backendOnline };
  });

  // Get current backend status
  ipcMain.handle('get-backend-status', () => {
    return { online: backendOnline, port: BACKEND_PORT };
  });
}

// ════════════════════════════════════════════════════════════
// AUTO UPDATER
// ════════════════════════════════════════════════════════════
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update_available', info.version);
  });

  autoUpdater.on('download-progress', (p) => {
    if (mainWindow) mainWindow.webContents.send('update_progress', p.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) mainWindow.webContents.send('update_downloaded');
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização Pronta',
      message: 'Uma nova versão do Guru Master foi baixada.\nDeseja reiniciar para aplicar?',
      buttons: ['Reiniciar Agora', 'Depois']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => console.error('[AutoUpdater]', err));

  // Check for updates 10s after launch (don't delay startup)
  setTimeout(() => {
    try { autoUpdater.checkForUpdatesAndNotify(); } catch {}
  }, 10000);
}
