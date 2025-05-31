const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let miniBrowserWindows = new Set();

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 600,
    height: 450,
    x: Math.floor(width / 2) - 300,
    y: 200,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  mainWindow.loadFile('renderer/index.html');
}

function createMiniBrowser() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  const miniBrowserWindow = new BrowserWindow({
    width: 400,
    height: 400,
    x: width - 410,
    y: 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: true,
    roundedCorners: true,
    skipTaskbar: true, // Oculta de la barra de tareas de Windows
    webPreferences: {
      preload: path.join(__dirname, 'browser_preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      nativeWindowOpen: true
    }
  });

  if (process.platform === 'darwin') {
    // No mostrar en el dock para macOS
    miniBrowserWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  
  miniBrowserWindow.loadFile('renderer/mini_browser.html');
  
  // Manejo mejorado de popups
  miniBrowserWindow.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
    // Permitir popups pequeños (como los de autenticación)
    if (frameName === '_blank' || (features && features.includes('popup'))) {
      const popupWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        frame: true,
        skipTaskbar: true, // También ocultar popups del dock/taskbar
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });
      
      popupWindow.loadURL(url);
      
      popupWindow.on('closed', () => {
        popupWindow.destroy();
      });
      
      return { action: 'deny' };
    }
    
    // Para otras ventanas, crear nueva instancia del mini navegador
    const newWindow = createMiniBrowser();
    newWindow.show();
    newWindow.loadURL(url);
    return { action: 'deny' };
  });

  miniBrowserWindow.hide();
  
  miniBrowserWindow.on('close', (event) => {
    event.preventDefault();
    miniBrowserWindow.hide();
  });

  miniBrowserWindow.on('closed', () => {
    miniBrowserWindows.delete(miniBrowserWindow);
  });

  miniBrowserWindows.add(miniBrowserWindow);
  return miniBrowserWindow;
}

function registerShortcuts() {
  const toggleBrowserShortcut = process.platform === 'darwin' ? 'CommandOrControl+Shift+E' : 'Ctrl+Shift+E';
  
  globalShortcut.register(toggleBrowserShortcut, () => {
    if (miniBrowserWindows.size === 0) {
      createMiniBrowser().show();
    } else {
      let allHidden = true;
      miniBrowserWindows.forEach(window => {
        if (window.isVisible()) {
          allHidden = false;
        }
      });
      
      miniBrowserWindows.forEach(window => {
        if (allHidden) {
          window.show();
        } else {
          window.hide();
        }
      });
    }
  });
}

app.whenReady().then(() => {
  // Solo mostrar la ventana principal en el dock
  createWindow();
  registerShortcuts();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      registerShortcuts();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.on('hide-mini-browser', () => {
  miniBrowserWindows.forEach(window => window.hide());
});

ipcMain.on('show-mini-browser', () => {
  if (miniBrowserWindows.size === 0) {
    createMiniBrowser().show();
  } else {
    miniBrowserWindows.forEach(window => window.show());
  }
});

ipcMain.on('toggle-mini-browser', () => {
  if (miniBrowserWindows.size === 0) {
    createMiniBrowser().show();
  } else {
    let allHidden = true;
    miniBrowserWindows.forEach(window => {
      if (window.isVisible()) {
        allHidden = false;
      }
    });
    
    miniBrowserWindows.forEach(window => {
      if (allHidden) {
        window.show();
      } else {
        window.hide();
      }
    });
  }
});

// Mejorado el manejo de cierre de la aplicación
ipcMain.on('quit-app', () => {
  // Eliminar los event handlers de 'close' en todas las mini ventanas del navegador
  miniBrowserWindows.forEach(window => {
    // Eliminar todos los listeners de evento 'close'
    window.removeAllListeners('close');
    // Destruir la ventana directamente en lugar de cerrarla
    window.destroy();
  });
  
  // Limpiar la colección de ventanas
  miniBrowserWindows.clear();
  
  // Cerrar la ventana principal si existe
  if (mainWindow) {
    mainWindow.destroy();
  }
  
  // Desregistrar todos los atajos de teclado globales
  globalShortcut.unregisterAll();
  
  // Forzar el cierre de la aplicación
  app.exit(0);
});

ipcMain.on('url-updated', (event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('browser-url-updated', url);
  }
});

ipcMain.handle('navigate-to-url', async (event, url) => {
  if (miniBrowserWindows.size > 0) {
    const firstWindow = miniBrowserWindows.values().next().value;
    firstWindow.webContents.send('load-url', url);
    firstWindow.show();
    return true;
  } else {
    const newWindow = createMiniBrowser();
    newWindow.show();
    newWindow.webContents.on('did-finish-load', () => {
      newWindow.webContents.send('load-url', url);
    });
    return true;
  }
});

ipcMain.on('open-new-window', (event, url) => {
  const newWindow = createMiniBrowser();
  newWindow.show();
  
  if (url) {
    newWindow.webContents.on('did-finish-load', () => {
      newWindow.webContents.send('load-url', url);
    });
  }
});

ipcMain.on('close-tab', (tabId) => {
  // No se requiere acción adicional en el proceso principal
  // Ya que las pestañas se administran en el proceso de renderizado
});

if (process.platform === 'darwin') {
  app.on('activate-with-no-open-windows', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
    
    if (miniBrowserWindows.size === 0) {
      createMiniBrowser().show();
    } else {
      miniBrowserWindows.forEach(window => window.show());
    }
  });
}