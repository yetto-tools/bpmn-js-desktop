/**
 * Punto de entrada del bundle de extensiones del modelador:
 *
 * - validación en vivo del modelo (bpmnlint)
 * - simulación del flujo con tokens
 * - selector de color de los elementos
 * - opciones «...» para crear y anexar cualquier tipo de elemento
 *
 * La configuración de reglas se empaqueta a partir de `app/.bpmnlintrc`.
 */

export { default as lintModule } from 'bpmn-js-bpmnlint';
export { default as TokenSimulationModule } from 'bpmn-js-token-simulation';
export { default as ColorPickerModule } from 'bpmn-js-color-picker';
export { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';
export { default as bpmnlintConfig } from './generated/bpmnlint-config.js';
