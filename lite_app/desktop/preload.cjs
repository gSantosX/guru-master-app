const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveVideo: (jobId, defaultName) => ipcRenderer.invoke('save-video', jobId, defaultName),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openInFolder: (fullPath) => ipcRenderer.invoke('open-in-folder', fullPath)
});
