const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- VIDEO & FILES ---
  saveVideo:    (jobId, defaultName) => ipcRenderer.invoke('save-video', jobId, defaultName),
  selectFolder: ()                   => ipcRenderer.invoke('select-folder'),
  openInFolder: (fullPath)           => ipcRenderer.invoke('open-in-folder', fullPath),
  saveFile:     (content, filename)  => ipcRenderer.invoke('save-file', content, filename),

  // --- BACKEND CONTROL ---
  restartBackend: ()         => ipcRenderer.invoke('restart-backend'),
  getBackendStatus: ()       => ipcRenderer.invoke('get-backend-status'),

  // --- REAL-TIME STATUS ---
  onBackendStatus:   (cb) => ipcRenderer.on('backend-status',   (_e, data) => cb(data)),
  onUpdateAvailable: (cb) => ipcRenderer.on('update_available',  (_e, v)    => cb(v)),
  onUpdateProgress:  (cb) => ipcRenderer.on('update_progress',   (_e, pct)  => cb(pct)),
  onUpdateDownloaded:(cb) => ipcRenderer.on('update_downloaded', (_e)       => cb()),

  // --- CLEANUP ---
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
