const { contextBridge, ipcRenderer } = require('electron');

// Arayüze yalnızca menü eylemleri açılır; Node erişimi yoktur.
contextBridge.exposeInMainWorld('hanamiDesktop', {
  platform: process.platform,
  onMenu(handler) {
    const listener = (_event, action) => handler(action);
    ipcRenderer.on('hanami:menu', listener);
    return () => ipcRenderer.removeListener('hanami:menu', listener);
  }
});
