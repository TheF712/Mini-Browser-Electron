const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniBrowser', {
  showBrowser: () => ipcRenderer.send('show-mini-browser'),
  hideBrowser: () => ipcRenderer.send('hide-mini-browser'),
  toggleBrowser: () => ipcRenderer.send('toggle-mini-browser'),
  quitApp: () => ipcRenderer.send('quit-app'),
  
  // Recibir actualizaciones de URL
  onUrlUpdate: (callback) => ipcRenderer.on('browser-url-updated', (event, url) => callback(event, url)),
  
  // Navegar a URL
  navigateToUrl: (url) => ipcRenderer.invoke('navigate-to-url', url)
});