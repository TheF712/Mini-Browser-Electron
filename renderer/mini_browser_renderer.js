document.addEventListener('DOMContentLoaded', () => {
  console.log('Mini Browser DOM cargado');
  
  // Referencias a elementos
  const addressBar = document.getElementById('address-bar');
  const goButton = document.getElementById('go-button');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const refreshButton = document.getElementById('refresh-button');
  const closeButton = document.getElementById('close-button');
  const newWindowButton = document.getElementById('new-window-button');
  const shortcutText = document.querySelector('#keyboard-shortcuts span');
  const tabsContainer = document.getElementById('tabs-container');
  const addTabButton = document.getElementById('add-tab-button');
  const browserContent = document.getElementById('browser-content');
  
  // Gestión de pestañas
  let tabs = [];
  let activeTabId = null;
  
  if (navigator.platform.indexOf('Mac') !== -1) {
    shortcutText.textContent = '⌘+⇧+E para mostrar/ocultar';
  }
  
  function createTab(url = 'https://www.google.com/') {
    const tabId = 'tab-' + Date.now();
    
    // Crear el elemento de la pestaña
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tabId;
    tabElement.innerHTML = `
      <span class="tab-title">Nueva Pestaña</span>
      <span class="tab-close">×</span>
    `;
    
    // Insertar la pestaña antes del botón de añadir
    tabsContainer.insertBefore(tabElement, addTabButton);
    
    // Crear el contenedor del webview
    const webviewContainer = document.createElement('div');
    webviewContainer.className = 'webview-container';
    webviewContainer.id = tabId;
    
    // Crear el webview
    const webview = document.createElement('webview');
    webview.src = url;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'nativeWindowOpen=yes');
    webview.id = 'webview-' + tabId;
    
    // Asegurar que el webview tenga los estilos adecuados
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.border = 'none';
    
    webviewContainer.appendChild(webview);
    browserContent.appendChild(webviewContainer);
    
    // Configurar eventos del webview
    setupWebviewEvents(webview, tabElement);
    
    // Añadir a la colección de pestañas
    tabs.push({
      id: tabId,
      element: tabElement,
      webview: webview,
      container: webviewContainer,
      url: url
    });
    
    // Activar la pestaña recién creada
    setActiveTab(tabId);
    
    // Configurar eventos de la pestaña
    const tabCloseButton = tabElement.querySelector('.tab-close');
    if (tabCloseButton) {
      tabCloseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
      });
    }
    
    tabElement.addEventListener('click', () => {
      setActiveTab(tabId);
    });
    
    return tabId;
  }
  
  function closeTab(tabId) {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    
    if (tabIndex !== -1) {
      const tab = tabs[tabIndex];
      
      // Eliminar elementos del DOM
      if (tab.element && tab.element.parentNode) {
        tab.element.remove();
      }
      
      if (tab.container && tab.container.parentNode) {
        tab.container.remove();
      }
      
      // Eliminar de la colección
      tabs.splice(tabIndex, 1);
      
      // Determinar qué pestaña activar a continuación
      if (activeTabId === tabId) {
        if (tabs.length > 0) {
          // Intentar activar la pestaña a la izquierda o derecha
          const newActiveTab = tabs[Math.min(tabIndex, tabs.length - 1)];
          setActiveTab(newActiveTab.id);
        } else {
          // Si no hay más pestañas, crear una nueva
          console.log("Última pestaña cerrada, creando una nueva");
          createTab();
        }
      }
      
      // Notificar al proceso principal
      if (window.miniBrowserBridge && window.miniBrowserBridge.closeTab) {
        window.miniBrowserBridge.closeTab(tabId);
      }
    }
  }
  
  function setActiveTab(tabId) {
    // Desactivar todas las pestañas
    tabs.forEach(tab => {
      if (tab.element) tab.element.classList.remove('active');
      if (tab.container) tab.container.classList.remove('active');
    });
    
    // Buscar y activar la pestaña seleccionada
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      if (tab.element) tab.element.classList.add('active');
      if (tab.container) tab.container.classList.add('active');
      activeTabId = tabId;
      
      // Actualizar barra de direcciones con la URL actual
      if (addressBar && tab.url) {
        addressBar.value = tab.url || '';
      }
      
      // Actualizar estado de los botones de navegación
      if (tab.webview) {
        updateNavigationButtons(tab.webview);
      }
    }
  }
  
  function setupWebviewEvents(webview, tabElement) {
    if (!webview || !tabElement) return;
    
    webview.addEventListener('did-start-loading', () => {
      if (activeTabId === tabElement.dataset.tabId) {
        if (refreshButton) {
          refreshButton.textContent = '✕';
          refreshButton.title = 'Detener';
        }
      }
    });
    
    webview.addEventListener('did-stop-loading', () => {
      if (activeTabId === tabElement.dataset.tabId) {
        if (refreshButton) {
          refreshButton.textContent = '↻';
          refreshButton.title = 'Actualizar';
        }
        updateNavigationButtons(webview);
      }
    });
    
    webview.addEventListener('did-finish-load', () => {
      const currentUrl = webview.getURL();
      const tabId = tabElement.dataset.tabId;
      const tab = tabs.find(t => t.id === tabId);
      
      if (tab) {
        tab.url = currentUrl;
        
        // Actualizar título de la pestaña
        // Aquí está la corrección: getTitle() no es una promesa, es un método sincrónico
        const title = webview.getTitle();
        const tabTitle = tabElement.querySelector('.tab-title');
        if (tabTitle) {
          tabTitle.textContent = title || 'Nueva Pestaña';
          tabTitle.title = title || 'Nueva Pestaña';
        }
        
        // Actualizar barra de direcciones si esta pestaña está activa
        if (activeTabId === tabId) {
          if (addressBar) addressBar.value = currentUrl;
          if (window.miniBrowserBridge && window.miniBrowserBridge.sendUrlUpdate) {
            window.miniBrowserBridge.sendUrlUpdate(currentUrl);
          }
        }
      }
    });
    
    // Otra opción: Usar el evento page-title-updated para actualizar el título
    webview.addEventListener('page-title-updated', (event) => {
      const tabId = tabElement.dataset.tabId;
      const tabTitle = tabElement.querySelector('.tab-title');
      
      if (tabTitle && event.title) {
        tabTitle.textContent = event.title;
        tabTitle.title = event.title;
      }
    });
    
    webview.addEventListener('did-navigate', (event) => {
      const tabId = tabElement.dataset.tabId;
      const tab = tabs.find(t => t.id === tabId);
      
      if (tab) {
        tab.url = event.url;
        
        if (activeTabId === tabId) {
          if (addressBar) addressBar.value = event.url;
          if (window.miniBrowserBridge && window.miniBrowserBridge.sendUrlUpdate) {
            window.miniBrowserBridge.sendUrlUpdate(event.url);
          }
        }
      }
    });
    
    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (window.miniBrowserBridge && window.miniBrowserBridge.openNewWindow) {
        window.miniBrowserBridge.openNewWindow(e.url);
      }
    });
  }
  
  function updateNavigationButtons(webview) {
    if (!webview || !backButton || !forwardButton) return;
    
    try {
      const canGoBack = webview.canGoBack();
      const canGoForward = webview.canGoForward();
      
      backButton.disabled = !canGoBack;
      forwardButton.disabled = !canGoForward;
      backButton.style.opacity = canGoBack ? '1' : '0.5';
      forwardButton.style.opacity = canGoForward ? '1' : '0.5';
    } catch (err) {
      console.error('Error al actualizar botones de navegación:', err);
    }
  }
  
  function navigateToUrl(url) {
    let formattedUrl = url.trim();
    
    // Formatear URL si es necesario
    if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
        formattedUrl = 'https://' + formattedUrl;
      } else {
        formattedUrl = 'https://www.google.com/search?q=' + encodeURIComponent(formattedUrl);
      }
    }
    
    // Navegar a la URL en la pestaña activa
    if (formattedUrl && activeTabId) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.webview) {
        activeTab.webview.src = formattedUrl;
        if (addressBar) addressBar.value = formattedUrl;
      }
    }
  }
  
  // Event listeners
  if (goButton) {
    goButton.addEventListener('click', () => {
      if (addressBar) navigateToUrl(addressBar.value);
    });
  }
  
  if (addressBar) {
    addressBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        navigateToUrl(addressBar.value);
      }
    });
  }
  
  if (backButton) {
    backButton.addEventListener('click', () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.webview && activeTab.webview.canGoBack()) {
        activeTab.webview.goBack();
      }
    });
  }
  
  if (forwardButton) {
    forwardButton.addEventListener('click', () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.webview && activeTab.webview.canGoForward()) {
        activeTab.webview.goForward();
      }
    });
  }
  
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.webview) {
        if (refreshButton.textContent === '✕') {
          activeTab.webview.stop();
        } else {
          activeTab.webview.reload();
        }
      }
    });
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (window.miniBrowserBridge && window.miniBrowserBridge.hideBrowser) {
        window.miniBrowserBridge.hideBrowser();
      }
    });
  }
  
  if (newWindowButton) {
    newWindowButton.addEventListener('click', () => {
      if (window.miniBrowserBridge && window.miniBrowserBridge.openNewWindow) {
        window.miniBrowserBridge.openNewWindow();
      }
    });
  }
  
  if (addTabButton) {
    addTabButton.addEventListener('click', () => {
      createTab();
    });
  }
  
  // Manejar URLs desde el proceso principal
  if (window.miniBrowserBridge && window.miniBrowserBridge.onLoadUrl) {
    window.miniBrowserBridge.onLoadUrl((url) => {
      if (url) {
        if (tabs.length === 0) {
          createTab(url);
        } else {
          navigateToUrl(url);
        }
      }
    });
  }
  
  // Crear primera pestaña al cargar
  createTab('https://www.google.com/');
});