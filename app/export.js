/**
 * Conversión del diagrama a imagen de mapa de bits.
 *
 * Se hace en el navegador, sin llamadas a servicios externos.
 */

/** Escala aplicada al exportar a PNG, para obtener una imagen nítida. */
const PNG_SCALE = 2;

/**
 * Lee las dimensiones declaradas en el SVG exportado por bpmn-js.
 *
 * @param {string} svg
 * @returns {{ width: number, height: number }}
 */
export function getSvgDimensions(svg) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);

  if (viewBoxMatch) {
    const [ , , width, height ] = viewBoxMatch[1].trim().split(/\s+/).map(Number);

    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  const width = Number((svg.match(/width="([\d.]+)/) || [])[1]);
  const height = Number((svg.match(/height="([\d.]+)/) || [])[1]);

  return {
    width: width > 0 ? width : 1200,
    height: height > 0 ? height : 800
  };
}

/**
 * Convierte el SVG del diagrama en un PNG con fondo blanco.
 *
 * @param {string} svg
 * @returns {Promise<Blob>}
 */
export async function svgToPng(svg) {
  const { width, height } = getSvgDimensions(svg);

  const url = URL.createObjectURL(new Blob([ svg ], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = await loadImage(url);

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * PNG_SCALE);
    canvas.height = Math.ceil(height * PNG_SCALE);

    const context = canvas.getContext('2d');

    // el SVG exportado es transparente; sobre fondo blanco es siempre legible
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await toBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('no se pudo rasterizar el diagrama'));

    image.src = url;
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      blob ? resolve(blob) : reject(new Error('no se pudo generar el PNG'));
    }, 'image/png');
  });
}
