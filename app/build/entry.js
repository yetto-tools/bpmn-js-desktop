/**
 * Punto de entrada del bundle del panel de propiedades.
 *
 * Se exponen únicamente los módulos de BPMN estándar; los proveedores
 * específicos de Camunda y Zeebe se dejan fuera a propósito para no cargar
 * propiedades de motores que esta aplicación no usa.
 */

export {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
