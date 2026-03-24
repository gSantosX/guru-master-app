const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC bridge methods here if needed
  // Example: ping: () => ipcRenderer.invoke('ping')
});
