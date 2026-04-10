const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = electron;

if (typeof electron === 'string') {
    console.error('ERROR: require("electron") returned a string path instead of the API.');
}

let mainWindow;
let backendProcess;
let tray = null;
let isQuitting = false;

// --- SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // --- APP INITIALIZATION ---
  app.whenReady().then(() => {
    // IPC Handlers
    ipcMain.handle('save-video', async (event, jobId, suggestedName) => {
        try {
            const sourcePath = path.join(__dirname, '../backend/output', `${jobId}.mp4`);
            if (!fs.existsSync(sourcePath)) {
                return { success: false, error: 'Arquivo original não encontrado no sistema local.' };
            }
            const { canceled, filePath } = await electron.dialog.showSaveDialog({
                title: "Salvar Vídeo Renderizado",
                defaultPath: suggestedName || `video_${jobId.slice(0,6)}.mp4`,
                filters: [{ name: 'Movies', extensions: ['mp4'] }]
            });
            if (canceled || !filePath) return { success: false, canceled: true };
            fs.copyFileSync(sourcePath, filePath);
            return { success: true, savedPath: filePath };
        } catch (err) {
            console.error("Erro ao salvar vídeo:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('select-folder', async () => {
        try {
            const { canceled, filePaths } = await electron.dialog.showOpenDialog({
                title: "Selecionar Pasta de Saída",
                properties: ['openDirectory', 'createDirectory']
            });
            if (canceled || filePaths.length === 0) return { success: false };
            return { success: true, folderPath: filePaths[0] };
        } catch (err) {
            console.error("Erro ao abrir seletor de pastas:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('open-in-folder', async (event, fullPath) => {
        try {
            if (!fs.existsSync(fullPath)) return { success: false, error: 'Arquivo não encontrado' };
            electron.shell.showItemInFolder(fullPath);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    startBackend();
    createTray();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    // No Windows/Linux, não fechamos o app para manter os serviços (Vite/Backend) rodando
    if (process.platform === 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
      isQuitting = true;
      if (backendProcess) backendProcess.kill();
  });
}

// --- HELPER FUNCTIONS ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "GURU MASTER - AI Video Pipeline",
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../icon.ico');
  if (!fs.existsSync(iconPath)) {
    console.error("Tray icon not found at:", iconPath);
  }
  
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Abrir App', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      } 
    },
    {
      label: 'Abrir no Navegador (5173)',
      click: () => {
        shell.openExternal('http://localhost:5173');
      }
    },
    { type: 'separator' },
    { 
      label: 'Sair do Guru Master', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('GURU MASTER - AI Video Pipeline');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}

function startBackend() {
  console.log("Starting backend...");
  const venvPath = path.join(__dirname, '../backend/venv/Scripts/python.exe');
  const apiPath = path.join(__dirname, '../backend/api.py');
  
  const cmd = spawn(venvPath, [apiPath], {
    cwd: path.join(__dirname, '../backend'),
    shell: false,
    windowsHide: true
  });

  cmd.stdout.on('data', (data) => console.log(`Backend: ${data}`));
  cmd.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
  cmd.on('error', (err) => console.error('Failed to start backend process:', err));

  backendProcess = cmd;
}
