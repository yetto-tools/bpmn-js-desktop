/**
 * Modelador BPMN autoalojado.
 *
 * Toda la aplicación se sirve de forma local: el bundle de bpmn-js y sus
 * recursos viven en `vendor/`, no se contacta con ningún servicio externo.
 */

import customTranslate from './translations/customTranslate.js';
import translateLintMessage from './translations/lint-es.js';
import localizeSimulation from './translations/simulation-es.js';
import { svgToPng } from './export.js';
import { svgToPdf } from './pdf.js';

const STORAGE_KEY = 'bpmn-app:diagram';
const STORAGE_NAME_KEY = 'bpmn-app:file-name';
const STORAGE_TIME_KEY = 'bpmn-app:saved-at';
const STORAGE_PANEL_KEY = 'bpmn-app:panel-visible';
const STORAGE_LINTING_KEY = 'bpmn-app:linting-continuous';
const STORAGE_PDF_KEY = 'bpmn-app:pdf-options';

const AUTOSAVE_DELAY = 800;

const DEFAULT_FILE_NAME = 'diagrama.bpmn';

const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} = window.BpmnPropertiesPanel;

const {
  lintModule,
  TokenSimulationModule,
  ColorPickerModule,
  CreateAppendAnythingModule,
  bpmnlintConfig
} = window.BpmnTools;

const modeler = new window.BpmnJS({
  container: '#canvas',
  keyboard: { bindTo: document },
  propertiesPanel: { parent: '#properties' },
  linting: { bpmnlint: bpmnlintConfig, active: true },
  additionalModules: [
    { translate: [ 'value', customTranslate ] },
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    lintModule,
    TokenSimulationModule,
    ColorPickerModule,
    CreateAppendAnythingModule
  ]
});

// expuesto para depuración desde la consola del navegador
window.modeler = modeler;

const canvas = modeler.get('canvas');
const commandStack = modeler.get('commandStack');

const elements = {
  properties: document.getElementById('properties'),
  toggleProperties: document.getElementById('toggle-properties'),
  validate: document.getElementById('validate'),
  toggleSimulation: document.getElementById('toggle-simulation'),
  problems: document.getElementById('problems'),
  problemsList: document.getElementById('problems-list'),
  problemsSummary: document.getElementById('problems-summary'),
  problemsBadge: document.getElementById('problems-badge'),
  lintingContinuous: document.getElementById('linting-continuous'),
  shortcuts: document.getElementById('shortcuts'),
  pdfOptions: document.getElementById('pdf-options'),
  pdfForm: document.getElementById('pdf-form'),
  pdfHint: document.getElementById('pdf-hint'),
  fileName: document.getElementById('file-name'),
  autosave: document.getElementById('autosave-status'),
  notification: document.getElementById('notification'),
  dropHint: document.getElementById('drop-hint'),
  fileInput: document.getElementById('file-input'),
  undo: document.querySelector('[data-action="undo"]'),
  redo: document.querySelector('[data-action="redo"]'),
  cut: document.getElementById('cut'),
  copy: document.getElementById('copy')
};

let fileName = DEFAULT_FILE_NAME;

// #region archivo

/**
 * Carga un diagrama en el modelador.
 *
 * @param {string} xml
 * @param {string} [name] nombre de archivo asociado
 */
async function openDiagram(xml, name) {
  try {
    const { warnings } = await modeler.importXML(xml);

    setFileName(name || fileName);
    canvas.zoom('fit-viewport', 'auto');

    if (warnings.length) {
      notify(`Diagrama abierto con ${warnings.length} advertencia(s). Revisa la consola.`);
      console.warn('Advertencias al importar:', warnings);
    }

    return true;
  } catch (error) {
    notify(`No se pudo abrir el diagrama: ${error.message}`, true);
    console.error(error);

    return false;
  }
}

/**
 * Abre un archivo seleccionado por el usuario.
 *
 * @param {File} file
 */
async function openFile(file) {
  const xml = await file.text();

  await openDiagram(xml, file.name);
}

/**
 * @param {string} name
 */
function setFileName(name) {
  fileName = name || DEFAULT_FILE_NAME;
  elements.fileName.textContent = fileName;
  document.title = `${fileName} — Modelador BPMN`;
}

/**
 * Reemplaza la extensión del archivo actual.
 *
 * @param {string} extension
 * @returns {string}
 */
function fileNameWith(extension) {
  return `${fileName.replace(/\.[^.]+$/, '')}.${extension}`;
}

/**
 * Descarga un contenido como archivo.
 *
 * @param {string|Blob} contents
 * @param {string} name
 * @param {string} [type]
 */
function download(contents, name, type = 'application/octet-stream') {
  const blob = contents instanceof Blob ? contents : new Blob([ contents ], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  // el objeto se libera una vez que el navegador ha iniciado la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadBpmn() {
  const { xml } = await modeler.saveXML({ format: true });

  download(xml, fileNameWith('bpmn'), 'application/xml');
  notify(`Descargado ${fileNameWith('bpmn')}`);
}

async function downloadSvg() {
  const { svg } = await modeler.saveSVG();

  download(svg, fileNameWith('svg'), 'image/svg+xml');
  notify(`Descargado ${fileNameWith('svg')}`);
}

async function downloadPng() {
  const { svg } = await modeler.saveSVG();
  const blob = await svgToPng(svg);

  download(blob, fileNameWith('png'), 'image/png');
  notify(`Descargado ${fileNameWith('png')}`);
}

/**
 * Exporta a PDF con las opciones elegidas en el diálogo.
 *
 * @param {Object} options
 */
async function downloadPdf(options) {
  notify('Generando el PDF…');

  const { svg } = await modeler.saveSVG();
  const blob = await svgToPdf(svg, options);

  download(blob, fileNameWith('pdf'), 'application/pdf');
  notify(`Descargado ${fileNameWith('pdf')}`);
}

// #region opciones de PDF

/**
 * Abre el diálogo de exportación, con las últimas opciones usadas.
 */
function openPdfOptions() {
  let stored = {};

  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_PDF_KEY) || '{}');
  } catch {

    // preferencias ilegibles: se usan las de fábrica
  }

  fillPdfOptions(stored);

  // el título por defecto es el nombre del diagrama
  if (!elements.pdfForm.title.value) {
    elements.pdfForm.title.placeholder = fileNameWith('bpmn');
  }

  updatePdfForm();
  elements.pdfOptions.showModal();
}

/**
 * Lee las opciones del formulario.
 *
 * @returns {Object}
 */
function readPdfOptions() {
  const data = new FormData(elements.pdfForm);

  return {
    page: data.get('page'),
    orientation: data.get('orientation'),
    margin: Number(data.get('margin')),
    center: data.has('center'),
    fit: data.has('fit'),
    border: data.has('border'),
    title: String(data.get('title') || '').trim() || fileNameWith('bpmn'),
    showTitle: data.has('showTitle'),
    showDate: data.has('showDate'),
    showPage: data.has('showPage')
  };
}

/**
 * Vuelca en el formulario unas opciones guardadas.
 *
 * @param {Object} options
 */
function fillPdfOptions(options) {
  const form = elements.pdfForm;

  form.page.value = options.page || 'fit';
  form.orientation.value = options.orientation || 'auto';
  form.margin.value = options.margin ?? 10;
  form.center.checked = options.center !== false;
  form.fit.checked = options.fit !== false;
  form.border.checked = Boolean(options.border);
  form.title.value = options.title || '';
  form.showTitle.checked = options.showTitle !== false;
  form.showDate.checked = options.showDate !== false;
  form.showPage.checked = Boolean(options.showPage);
}

/**
 * Ajusta el formulario a las opciones que tienen sentido entre sí.
 */
function updatePdfForm() {
  const fitToDiagram = elements.pdfForm.page.value === 'fit';

  // con la página ajustada al diagrama no hay espacio sobrante que repartir
  for (const name of [ 'orientation', 'center', 'fit' ]) {
    elements.pdfForm[name].disabled = fitToDiagram;
  }

  elements.pdfHint.textContent = fitToDiagram
    ? 'La página tendrá el tamaño exacto del diagrama.'
    : 'El diagrama se ajustará a la página elegida.';
}

elements.pdfForm.addEventListener('change', updatePdfForm);

elements.pdfForm.addEventListener('submit', async () => {
  const options = readPdfOptions();

  localStorage.setItem(STORAGE_PDF_KEY, JSON.stringify(options));

  await runAction('download-pdf-now', options);
});

// #endregion

// #endregion

// #region autoguardado

let autosaveTimer = null;

/**
 * Guarda el diagrama en el almacenamiento del navegador, de forma que el
 * trabajo sobreviva a una recarga o a un cierre accidental.
 */
async function autosave() {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    const savedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, xml);
    localStorage.setItem(STORAGE_NAME_KEY, fileName);
    localStorage.setItem(STORAGE_TIME_KEY, savedAt);

    showAutosaveStatus(savedAt);
  } catch (error) {
    console.error('No se pudo autoguardar', error);
    elements.autosave.textContent = 'No se pudo autoguardar';
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosave, AUTOSAVE_DELAY);
}

/**
 * @param {string} isoDate
 */
function showAutosaveStatus(isoDate) {
  const time = new Date(isoDate).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  elements.autosave.textContent = `Guardado automáticamente a las ${time}`;
}

function clearAutosave() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_NAME_KEY);
  localStorage.removeItem(STORAGE_TIME_KEY);

  elements.autosave.textContent = '';
}

// #endregion

// #region panel de propiedades

/**
 * Muestra u oculta el panel lateral de propiedades y recuerda la preferencia.
 *
 * @param {boolean} visible
 */
function setPropertiesVisible(visible) {
  elements.properties.hidden = !visible;
  elements.toggleProperties.setAttribute('aria-pressed', String(visible));

  localStorage.setItem(STORAGE_PANEL_KEY, String(visible));

  // el lienzo cambió de tamaño: recalculamos el área visible
  canvas.resized();
}

// #endregion

// #region validación del modelo

/**
 * Último resultado de la validación, indexado por elemento.
 *
 * @type {Array<{ id: string, message: string, category: string }>}
 */
let problems = [];

/**
 * Vuelca en el panel inferior los problemas detectados por bpmnlint,
 * traducidos al español y ordenados por gravedad.
 *
 * @param {Object<string, Array<Object>>} issues
 */
function renderProblems(issues) {

  // al apagarla, el módulo emite un resultado vacío que no debe pisar el
  // mensaje de «sin validar»
  if (!modeler.get('linting').isActive()) {
    return;
  }

  problems = Object.entries(issues || {}).flatMap(([ elementId, elementIssues ]) =>
    elementIssues.map(issue => ({
      elementId,
      category: issue.category,
      message: translateLintMessage(issue.message)
    }))
  );

  problems.sort((a, b) => (a.category === b.category ? 0 : a.category === 'error' ? -1 : 1));

  const errors = problems.filter(problem => problem.category === 'error').length;
  const warnings = problems.length - errors;

  elements.problemsBadge.textContent = String(problems.length);
  elements.problemsBadge.hidden = problems.length === 0;
  elements.problemsBadge.classList.toggle('app-badge-error', errors > 0);

  elements.problemsSummary.textContent = problems.length
    ? `${errors} error(es), ${warnings} advertencia(s)`
    : 'Sin problemas detectados';

  elements.problemsList.innerHTML = problems.length
    ? problems.map((problem, index) => `
      <li class="app-problem app-problem-${problem.category}">
        <button type="button" class="app-problem-button" data-problem="${index}">
          <span class="app-problem-category">${problem.category === 'error' ? 'Error' : 'Aviso'}</span>
          <span class="app-problem-message">${escapeHtml(problem.message)}</span>
          <span class="app-problem-element">${escapeHtml(elementLabel(problem.elementId))}</span>
        </button>
      </li>`).join('')
    : '<li class="app-problem-empty">El modelo no tiene problemas de validación.</li>';
}

/**
 * Nombre legible de un elemento, para identificarlo en la lista.
 *
 * @param {string} elementId
 * @returns {string}
 */
function elementLabel(elementId) {
  const element = modeler.get('elementRegistry').get(elementId);

  if (!element) {
    return elementId;
  }

  return element.businessObject?.name || elementId;
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'
  })[character]);
}

/**
 * Muestra u oculta la lista de problemas.
 *
 * @param {boolean} visible
 */
function setProblemsVisible(visible) {
  elements.problems.hidden = !visible;

  canvas.resized();
}

/**
 * La validación es bajo demanda: se ejecuta al pulsar «Validar», como una
 * compilación. Así se puede modelar sin avisos de por medio, y los resultados
 * corresponden siempre a una comprobación que el usuario pidió.
 *
 * Quien prefiera el aviso inmediato puede marcar «Validar mientras edito».
 *
 * @type {boolean}
 */
let lintingContinuous = false;

/** Indica si en pantalla hay resultados de una validación. */
let validationShown = false;

/**
 * Ejecuta la validación y muestra los resultados.
 */
function runValidation() {
  const linting = modeler.get('linting');

  validationShown = true;

  if (linting.isActive()) {
    linting.update();
  } else {
    linting.toggle(true);
  }

  setProblemsVisible(true);
}

/**
 * Quita las marcas del diagrama y vacía la lista.
 *
 * @param {string} [reason] texto que explica por qué no hay resultados
 */
function clearValidation(reason = 'Sin validar') {
  modeler.get('linting').toggle(false);

  validationShown = false;
  problems = [];

  elements.problemsBadge.hidden = true;
  elements.problemsSummary.textContent = reason;
  elements.problemsList.innerHTML =
    '<li class="app-problem-empty">Pulsa «Validar» para comprobar el diagrama.</li>';
}

elements.lintingContinuous.addEventListener('change', event => {
  lintingContinuous = event.target.checked;

  localStorage.setItem(STORAGE_LINTING_KEY, String(lintingContinuous));

  if (lintingContinuous) {
    runValidation();
    notify('Se validará en cada cambio.');
  } else {
    clearValidation();
    notify('Validación bajo demanda: pulsa «Validar» cuando quieras comprobar el diagrama.');
  }
});

elements.problemsList.addEventListener('click', event => {
  const button = event.target.closest('[data-problem]');

  if (!button) {
    return;
  }

  const problem = problems[Number(button.dataset.problem)];
  const element = modeler.get('elementRegistry').get(problem.elementId);

  if (element) {
    modeler.get('selection').select(element);
    canvas.scrollToElement(element);
  }
});

modeler.on('linting.completed', event => renderProblems(event.issues));

// #endregion

// #region cortar, copiar y pegar

/**
 * Corta la selección: la copia al portapapeles del modelador y la elimina del
 * diagrama, de forma que `Ctrl+V` la coloque en otro sitio.
 *
 * bpmn-js trae copiar y pegar, pero no cortar.
 */
function cutSelection() {
  const selection = modeler.get('selection');
  const elements = selection.get().slice();

  if (!elements.length) {
    notify('Selecciona algún elemento para cortarlo.');

    return;
  }

  modeler.get('copyPaste').copy(elements);
  modeler.get('modeling').removeElements(elements);

  notify(`Cortado${elements.length > 1 ? 's' : ''} ${elements.length} elemento(s). Usa Ctrl+V para pegar.`);
}

/**
 * Copia la selección sin modificar el diagrama.
 */
function copySelection() {
  const elements = modeler.get('selection').get().slice();

  if (!elements.length) {
    return;
  }

  modeler.get('copyPaste').copy(elements);

  notify(`Copiado${elements.length > 1 ? 's' : ''} ${elements.length} elemento(s).`);
}

/**
 * Pega lo último cortado o copiado en el centro del área visible.
 */
function pasteSelection() {
  const canvasElement = document.getElementById('canvas').getBoundingClientRect();

  modeler.get('copyPaste').paste({
    element: canvas.getRootElement(),
    point: canvas.viewbox().x !== undefined
      ? {
        x: canvas.viewbox().x + canvas.viewbox().width / 2,
        y: canvas.viewbox().y + canvas.viewbox().height / 2
      }
      : { x: canvasElement.width / 2, y: canvasElement.height / 2 }
  });
}

// #endregion

// #region simulación

/**
 * Activa o desactiva el modo de simulación de tokens.
 *
 * @param {boolean} active
 */
function setSimulationActive(active) {
  modeler.get('toggleMode').toggleMode(active);
}

/** Deja de traducir los controles del simulador al salir del modo. */
let stopLocalizingSimulation = null;

modeler.on('tokenSimulation.toggleMode', event => {
  elements.toggleSimulation.setAttribute('aria-pressed', String(event.active));

  stopLocalizingSimulation?.();
  stopLocalizingSimulation = null;

  if (event.active) {
    stopLocalizingSimulation = localizeSimulation(document.getElementById('canvas'));

    notify('Modo simulación: pulsa el evento de inicio para lanzar un token.');
  }
});

// #endregion

// #region acciones

const actions = {
  'new': async () => {
    if (!confirm('¿Descartar el diagrama actual y empezar uno nuevo?')) {
      return;
    }

    clearAutosave();
    await openDiagram(EMPTY_DIAGRAM, DEFAULT_FILE_NAME);

    // un diagrama recién creado no debe aparecer lleno de avisos
    clearValidation();
  },
  'open': () => elements.fileInput.click(),
  'download-bpmn': downloadBpmn,
  'download-svg': downloadSvg,
  'download-png': downloadPng,
  'download-pdf': openPdfOptions,
  'download-pdf-now': downloadPdf,
  'close-pdf-options': () => elements.pdfOptions.close(),
  'undo': () => commandStack.undo(),
  'redo': () => commandStack.redo(),
  'cut': cutSelection,
  'copy': copySelection,
  'paste': pasteSelection,
  'zoom-in': () => canvas.zoom(canvas.zoom() * 1.2),
  'zoom-out': () => canvas.zoom(canvas.zoom() / 1.2),
  'zoom-fit': () => canvas.zoom('fit-viewport', 'auto'),
  'toggle-properties': () => setPropertiesVisible(elements.properties.hidden),
  'validate': runValidation,
  'clear-validation': () => {
    clearValidation();
    notify('Se quitaron las marcas de validación.');
  },
  'close-problems': () => setProblemsVisible(false),
  'toggle-shortcuts': () => {
    const dialog = elements.shortcuts;

    dialog.open ? dialog.close() : dialog.showModal();
  },
  'toggle-simulation': () => setSimulationActive(
    elements.toggleSimulation.getAttribute('aria-pressed') !== 'true'
  )
};

/**
 * @param {string} name
 * @param {...any} args argumentos propios de la acción
 */
async function runAction(name, ...args) {
  const action = actions[name];

  if (!action) {
    return;
  }

  try {
    await action(...args);
  } catch (error) {
    notify(`No se pudo completar la acción: ${error.message}`, true);
    console.error(error);
  }
}

// una sola delegación para la barra superior, las acciones sobre el lienzo
// y los botones de los paneles
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');

  if (button) {
    runAction(button.dataset.action);
  }
});

// cerrar la ayuda al pulsar fuera de ella
elements.shortcuts.addEventListener('click', event => {
  if (event.target === elements.shortcuts) {
    elements.shortcuts.close();
  }
});

elements.fileInput.addEventListener('change', async event => {
  const [ file ] = event.target.files;

  if (file) {
    await openFile(file);
  }

  // permite volver a abrir el mismo archivo
  event.target.value = '';
});

// #endregion

// #region atajos de teclado

document.addEventListener('keydown', event => {

  // «?» abre la ayuda, salvo mientras se escribe en un campo
  if (event.key === '?' && !/^(INPUT|TEXTAREA)$/.test(event.target.tagName) && !event.target.isContentEditable) {
    event.preventDefault();
    runAction('toggle-shortcuts');

    return;
  }

  // F8 valida, como una compilación
  if (event.key === 'F8') {
    event.preventDefault();
    runAction('validate');

    return;
  }

  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 's') {
    event.preventDefault();
    runAction('download-bpmn');
  }

  if (key === 'o') {
    event.preventDefault();
    runAction('open');
  }

  // bpmn-js gestiona copiar y pegar; cortar lo añadimos nosotros
  if (key === 'x' && !/^(INPUT|TEXTAREA)$/.test(event.target.tagName) && !event.target.isContentEditable) {
    event.preventDefault();
    runAction('cut');
  }
});

// #endregion

// #region arrastrar y soltar

let dragDepth = 0;

/**
 * @param {DragEvent} event
 * @returns {boolean}
 */
function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}

document.addEventListener('dragenter', event => {
  if (!hasFiles(event)) {
    return;
  }

  dragDepth++;
  elements.dropHint.hidden = false;
});

document.addEventListener('dragover', event => {
  if (hasFiles(event)) {
    event.preventDefault();
  }
});

document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);

  if (!dragDepth) {
    elements.dropHint.hidden = true;
  }
});

document.addEventListener('drop', async event => {
  if (!hasFiles(event)) {
    return;
  }

  event.preventDefault();

  dragDepth = 0;
  elements.dropHint.hidden = true;

  const [ file ] = event.dataTransfer.files;

  if (file) {
    await openFile(file);
  }
});

// #endregion

// #region avisos

let notificationTimer = null;

/**
 * @param {string} message
 * @param {boolean} [isError]
 */
function notify(message, isError = false) {
  elements.notification.textContent = message;
  elements.notification.classList.toggle('app-notification-error', isError);
  elements.notification.hidden = false;

  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    elements.notification.hidden = true;
  }, isError ? 8000 : 3000);
}

// #endregion

// #region arranque

function updateHistoryButtons() {
  elements.undo.disabled = !commandStack.canUndo();
  elements.redo.disabled = !commandStack.canRedo();
}

/** Cortar y copiar solo tienen sentido con algo seleccionado. */
function updateClipboardButtons() {
  const empty = modeler.get('selection').get().length === 0;

  elements.cut.disabled = empty;
  elements.copy.disabled = empty;
}

modeler.on([ 'selection.changed', 'import.done' ], updateClipboardButtons);

modeler.on('commandStack.changed', () => {
  updateHistoryButtons();
  scheduleAutosave();

  // los resultados dejan de valer en cuanto el diagrama cambia: se retiran
  // para no arrastrar marcas obsoletas mientras se edita
  if (validationShown && !lintingContinuous) {
    clearValidation('El diagrama cambió: vuelve a validar');
  }
});

modeler.on('import.done', updateHistoryButtons);

window.addEventListener('beforeunload', event => {
  if (commandStack.canUndo()) {

    // el navegador muestra su propio texto; basta con cancelar el evento
    event.preventDefault();
    event.returnValue = '';
  }
});

async function start() {
  setPropertiesVisible(localStorage.getItem(STORAGE_PANEL_KEY) !== 'false');
  updateClipboardButtons();

  // por defecto, validación bajo demanda: nada de marcas al abrir
  lintingContinuous = localStorage.getItem(STORAGE_LINTING_KEY) === 'true';
  elements.lintingContinuous.checked = lintingContinuous;

  clearValidation();

  const stored = localStorage.getItem(STORAGE_KEY);
  const storedName = localStorage.getItem(STORAGE_NAME_KEY);
  const storedTime = localStorage.getItem(STORAGE_TIME_KEY);

  if (stored) {
    const restored = await openDiagram(stored, storedName || DEFAULT_FILE_NAME);

    if (restored) {
      showAutosaveStatus(storedTime || new Date().toISOString());
      notify('Se restauró el último diagrama guardado en este navegador.');

      return;
    }
  }

  await openDiagram(EMPTY_DIAGRAM, DEFAULT_FILE_NAME);
}

start();

// #endregion
