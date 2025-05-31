document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado');
  
  // Referencias a elementos de la interfaz
  const openBrowserButton = document.getElementById('openBrowser');
  const quitAppButton = document.getElementById('quitApp');
  const shortcutText = document.getElementById('shortcutText');
  const currentUrlElement = document.getElementById('currentUrl');
  
  // Ajustar texto del atajo según el sistema operativo
  if (navigator.platform.indexOf('Mac') !== -1) {
    shortcutText.textContent = '⌘+Shift+E';
  } else {
    shortcutText.textContent = 'Ctrl+Shift+E';
  }
  
  // Agregar evento al botón para mostrar el mini navegador
  if (openBrowserButton) {
    openBrowserButton.addEventListener('click', () => {
      console.log('Botón abrir navegador clickeado');
      window.miniBrowser.showBrowser();
    });
  }
  
  // Agregar evento al botón para cerrar la aplicación
  if (quitAppButton) {
    quitAppButton.addEventListener('click', () => {
      console.log('Botón cerrar aplicación clickeado');
      window.miniBrowser.quitApp();
    });
  }
  
  // Escuchar actualizaciones de URL desde el mini navegador
  window.miniBrowser.onUrlUpdate((event, url) => {
    if (currentUrlElement) {
      if (url && url.trim() !== '') {
        currentUrlElement.textContent = `URL actual: ${url}`;
      } else {
        currentUrlElement.textContent = 'No hay navegación activa';
      }
    }
  });
});