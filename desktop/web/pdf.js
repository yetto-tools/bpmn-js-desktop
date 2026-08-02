/**
 * Exportación del diagrama a PDF.
 *
 * El PDF es vectorial: el SVG del diagrama se dibuja como gráficos y texto,
 * no como una imagen, así que se puede ampliar sin pixelarse y el texto es
 * seleccionable.
 *
 * El bundle que hace la conversión pesa bastante y solo se necesita al
 * exportar, así que se carga la primera vez que se usa.
 */

import { getSvgDimensions } from './export.js';

/** Ruta del bundle que se carga bajo demanda. */
const BUNDLE_URL = 'vendor/pdf-export.js';

/** Tamaños de página en puntos PostScript (72 pt = 1 pulgada). */
const PAGE_SIZES = {
  a4: [ 595.28, 841.89 ],
  a3: [ 841.89, 1190.55 ],
  letter: [ 612, 792 ]
};

/** Un milímetro en puntos. */
const MM = 72 / 25.4;

/** Altura reservada para la cabecera y el pie cuando llevan texto. */
const TEXT_BAND = 22;

let loading = null;

/**
 * Carga el bundle de PDF una sola vez.
 *
 * @returns {Promise<{ jsPDF: Function, svg2pdf: Function }>}
 */
function loadPdfBundle() {
  if (window.BpmnPdf) {
    return Promise.resolve(window.BpmnPdf);
  }

  loading = loading || new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src = BUNDLE_URL;
    script.onload = () => window.BpmnPdf
      ? resolve(window.BpmnPdf)
      : reject(new Error('el bundle de PDF no se registró'));
    script.onerror = () => reject(new Error(`no se pudo cargar ${BUNDLE_URL}`));

    document.head.appendChild(script);
  });

  return loading;
}

/**
 * @typedef {Object} PdfOptions
 * @property {'fit'|'a4'|'a3'|'letter'} [page] tamaño de página
 * @property {'auto'|'landscape'|'portrait'} [orientation]
 * @property {number} [margin] margen en milímetros
 * @property {boolean} [center] centrar el diagrama en la página
 * @property {boolean} [fit] reducir el diagrama si no cabe
 * @property {boolean} [border] dibujar un borde alrededor del diagrama
 * @property {string} [title] texto de la cabecera
 * @property {boolean} [showTitle]
 * @property {boolean} [showDate]
 * @property {boolean} [showPage]
 */

/**
 * Calcula el tamaño de página y la posición del diagrama dentro de ella.
 *
 * @param {{ width: number, height: number }} diagram tamaño del diagrama en puntos
 * @param {PdfOptions} options
 * @returns {{ page: number[], area: { x: number, y: number, width: number, height: number }, scale: number }}
 */
function layout(diagram, options) {
  const margin = (options.margin ?? 10) * MM;

  const headerHeight = options.showTitle ? TEXT_BAND : 0;
  const footerHeight = (options.showDate || options.showPage) ? TEXT_BAND : 0;

  // página ajustada al contenido: no hay que escalar ni centrar nada
  if (options.page === 'fit' || !PAGE_SIZES[options.page]) {
    const page = [
      diagram.width + margin * 2,
      diagram.height + margin * 2 + headerHeight + footerHeight
    ];

    return {
      page,
      scale: 1,
      area: { x: margin, y: margin + headerHeight, width: diagram.width, height: diagram.height }
    };
  }

  const [ shortSide, longSide ] = PAGE_SIZES[options.page];

  const landscape = options.orientation === 'landscape' ||
    (options.orientation !== 'portrait' && diagram.width >= diagram.height);

  const page = landscape ? [ longSide, shortSide ] : [ shortSide, longSide ];

  const available = {
    width: page[0] - margin * 2,
    height: page[1] - margin * 2 - headerHeight - footerHeight
  };

  const scale = options.fit === false
    ? 1
    : Math.min(1, available.width / diagram.width, available.height / diagram.height);

  const width = diagram.width * scale;
  const height = diagram.height * scale;

  return {
    page,
    scale,
    area: {
      x: options.center ? margin + (available.width - width) / 2 : margin,
      y: margin + headerHeight + (options.center ? (available.height - height) / 2 : 0),
      width,
      height
    }
  };
}

/**
 * Dibuja la cabecera, el pie y el borde.
 *
 * @param {Object} pdf documento de jsPDF
 * @param {number[]} page tamaño de la página
 * @param {{ x: number, y: number, width: number, height: number }} area
 * @param {PdfOptions} options
 */
function decorate(pdf, page, area, options) {
  const margin = (options.margin ?? 10) * MM;

  if (options.border) {
    pdf.setDrawColor(150);
    pdf.setLineWidth(0.75);
    pdf.rect(area.x - 6, area.y - 6, area.width + 12, area.height + 12);
  }

  pdf.setTextColor(90);

  if (options.showTitle && options.title) {
    pdf.setFontSize(12);
    pdf.text(options.title, margin, margin + 12, { maxWidth: page[0] - margin * 2 });
  }

  const footerY = page[1] - margin + 2;

  if (options.showDate) {
    pdf.setFontSize(9);
    pdf.text(
      new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' }),
      margin,
      footerY
    );
  }

  if (options.showPage) {
    pdf.setFontSize(9);
    pdf.text('Página 1 de 1', page[0] - margin, footerY, { align: 'right' });
  }
}

/**
 * Convierte el SVG del diagrama en un PDF de una página.
 *
 * @param {string} svg
 * @param {PdfOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function svgToPdf(svg, options = {}) {
  const { jsPDF, svg2pdf } = await loadPdfBundle();

  const diagram = getSvgDimensions(svg);

  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const element = parsed.documentElement;

  // svg2pdf necesita medidas explícitas en el elemento raíz
  element.setAttribute('width', String(diagram.width));
  element.setAttribute('height', String(diagram.height));

  const { page, area } = layout(diagram, options);

  const pdf = new jsPDF({
    orientation: page[0] >= page[1] ? 'landscape' : 'portrait',
    unit: 'pt',
    format: page
  });

  await svg2pdf(element, pdf, {
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height
  });

  decorate(pdf, page, area, options);

  return pdf.output('blob');
}
