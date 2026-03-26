const electron = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// If for some reason we are in Node mode but want to be in Electron mode,
// this script will probably fail on the next line if 'electron' was a string.
const { app, BrowserWindow, ipcMain } = electron;

if (typeof electron === 'string') {
    console.error('ERROR: require("electron") returned a string path instead of the API.');
    console.error('This means ELECTRON_RUN_AS_NODE=1 is likely set in the environment.');
}

let mainWindow;
let backendProcess;

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
    // icon: path.join(__dirname, '../public/favicon.ico') 
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  console.log("Starting backend...");
  
  const venvPath = path.join(__dirname, '../backend/venv/Scripts/python.exe');
  const apiPath = path.join(__dirname, '../backend/api.py');
  
  // Use shell: false to get the real PID of the python process
  const cmd = spawn(venvPath, [apiPath], {
    cwd: path.join(__dirname, '../backend'),
    shell: false,
    windowsHide: true
  });

  cmd.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  cmd.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess = cmd;
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
