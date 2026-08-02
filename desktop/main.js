/**
 * Proceso principal de la aplicación de escritorio.
 *
 * La interfaz es la misma aplicación web: se sirve desde un servidor local en
 * un puerto libre en lugar de cargarla con `file://`, porque el modelador usa
 * módulos ES y el navegador los bloquea en ese esquema.
 */

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('node:path');

/** Carpeta con la aplicación web (queda dentro del paquete). */
const APP_DIR = path.join(__dirname, 'web');

let server = null;
let mainWindow = null;

/**
 * Levanta el servidor interno.
 *
 * @returns {Promise<string>} dirección donde quedó escuchando
 */
async function startServer() {
  const { startStaticServer } = await import(
    require('node:url').pathToFileURL(path.join(APP_DIR, 'static-server.mjs')).href
  );

  const started = await startStaticServer(APP_DIR, { port: 0, host: '127.0.0.1' });

  server = started.server;

  return started.url;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Modelador BPMN',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(url);

  // la aplicación web cancela el `beforeunload` cuando hay cambios sin guardar.
  // En Electron eso bloquea la ventana en silencio, así que aquí se pregunta
  // con un diálogo nativo y se deja continuar si el usuario confirma.
  mainWindow.webContents.on('will-prevent-unload', event => {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Cerrar el modelador',
      message: 'Hay cambios sin guardar.',
      detail: 'Si cierras ahora, se perderán los cambios que no hayas guardado.',
      buttons: [ 'Cancelar', 'Cerrar de todos modos' ],
      defaultId: 0,
      cancelId: 0
    });

    if (response === 1) {

      // preventDefault aquí significa «ignora la cancelación de la página»
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // los enlaces externos se abren en el navegador, no dentro de la ventana
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);

    return { action: 'deny' };
  });
}

/**
 * Envía una acción de la barra de herramientas de la aplicación web.
 *
 * @param {string} action
 */
function trigger(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  // el segundo argumento marca la ejecución como gesto del usuario: sin él, el
  // navegador ignora lo que exige activación previa (abrir el selector de
  // archivos, lanzar una descarga, abrir un diálogo modal), que es casi todo
  // lo que dispara este menú
  mainWindow.webContents
    .executeJavaScript(
      `(() => {
        const button = document.querySelector('button[data-action="${action}"]:not([disabled])');

        if (!button) {
          return false;
        }

        button.click();

        return true;
      })()`,
      true
    )
    .catch(error => console.error(`No se pudo ejecutar la acción "${action}":`, error));
}

/**
 * Entrada de menú cuyo atajo ya gestiona la página.
 *
 * `registerAccelerator: false` muestra el atajo pero no lo captura, para que la
 * combinación siga llegando al modelador y a los campos de texto del panel de
 * propiedades (si no, Ctrl+C o Ctrl+Z dejarían de funcionar al escribir).
 *
 * @param {string} label
 * @param {string} accelerator
 * @param {string} action
 * @returns {Electron.MenuItemConstructorOptions}
 */
function pageItem(label, accelerator, action) {
  return {
    label,
    accelerator,
    registerAccelerator: false,
    click: () => trigger(action)
  };
}

function buildMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Nuevo diagrama', accelerator: 'CmdOrCtrl+N', click: () => trigger('new') },
        pageItem('Abrir…', 'CmdOrCtrl+O', 'open'),
        { type: 'separator' },
        pageItem('Guardar como BPMN', 'CmdOrCtrl+S', 'download-bpmn'),
        {
          label: 'Exportar',
          submenu: [
            { label: 'Imagen SVG', click: () => trigger('download-svg') },
            { label: 'Imagen PNG', click: () => trigger('download-png') },
            { label: 'Documento PDF', click: () => trigger('download-pdf') }
          ]
        },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        pageItem('Deshacer', 'CmdOrCtrl+Z', 'undo'),
        pageItem('Rehacer', 'CmdOrCtrl+Y', 'redo'),
        { type: 'separator' },
        pageItem('Cortar', 'CmdOrCtrl+X', 'cut'),
        pageItem('Copiar', 'CmdOrCtrl+C', 'copy'),
        pageItem('Pegar', 'CmdOrCtrl+V', 'paste')
      ]
    },
    {
      label: 'Ver',
      submenu: [
        pageItem('Acercar', 'CmdOrCtrl+Plus', 'zoom-in'),
        pageItem('Alejar', 'CmdOrCtrl+-', 'zoom-out'),
        pageItem('Ajustar al lienzo', 'CmdOrCtrl+0', 'zoom-fit'),
        { type: 'separator' },
        { label: 'Panel de propiedades', click: () => trigger('toggle-properties') },
        pageItem('Validar el modelo', 'F8', 'validate'),
        { label: 'Quitar marcas de validación', click: () => trigger('clear-validation') },
        { label: 'Simulación', click: () => trigger('toggle-simulation') },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { label: 'Herramientas de desarrollo', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Atajos de teclado', accelerator: 'F1', click: () => trigger('toggle-shortcuts') },
        { type: 'separator' },
        {
          label: 'Acerca de',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Acerca de',
            message: 'Modelador BPMN',
            detail:
              `Versión ${app.getVersion()}\n` +
              'Modelador de diagramas BPMN 2.0 en español.\n\n' +
              'Funciona sin conexión: todo el modelado ocurre en este equipo.',
            buttons: [ 'Cerrar' ]
          })
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// una sola instancia: al abrir otra, se enfoca la ventana existente
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();

      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const url = await startServer();

      buildMenu();
      createWindow(url);
    } catch (error) {
      dialog.showErrorBox(
        'No se pudo iniciar el modelador',
        `Error al arrancar el servidor interno:\n\n${error.message}`
      );

      app.quit();
    }
  });

  app.on('window-all-closed', () => {

    // `close` solo deja de aceptar conexiones nuevas: las que siguen abiertas
    // mantendrían vivo el proceso después de cerrar la ventana
    server?.closeAllConnections?.();
    server?.close();
    server = null;

    app.quit();
  });
}
