/**
 * Punto de entrada del bundle de exportación a PDF.
 *
 * Se construye por separado del resto porque solo se necesita cuando el
 * usuario exporta: la aplicación lo carga bajo demanda.
 */

export { jsPDF } from 'jspdf';
export { svg2pdf } from 'svg2pdf.js';
