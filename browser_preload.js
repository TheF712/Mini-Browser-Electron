const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniBrowserBridge', {
  hideBrowser: () => ipcRenderer.send('hide-mini-browser'),
  sendUrlUpdate: (url) => ipcRenderer.send('url-updated', url),
  onLoadUrl: (callback) => ipcRenderer.on('load-url', (event, url) => callback(url)),
  openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
  openNewTab: (url) => ipcRenderer.send('open-new-tab', url),
  closeTab: (tabId) => ipcRenderer.send('close-tab', tabId)
});