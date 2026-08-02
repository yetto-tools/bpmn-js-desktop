/**
 * Servidor estático mínimo, sin dependencias.
 *
 * Lo usan tanto el arranque por línea de comandos (`serve.mjs`) como la
 * aplicación de escritorio, que lo levanta en un puerto libre para servirse
 * sus propios archivos.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.bpmn': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Crea el servidor que sirve los archivos de una carpeta.
 *
 * @param {string} rootDir carpeta que se publica
 * @returns {import('node:http').Server}
 */
export function createStaticServer(rootDir) {
  return createServer(async (request, response) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    const relativePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const filePath = join(rootDir, normalize(relativePath));

    // impide salir de la carpeta servida
    if (!filePath.startsWith(rootDir + sep)) {
      response.writeHead(403).end('403 Prohibido');
      return;
    }

    try {
      const stats = await stat(filePath);

      if (!stats.isFile()) {
        throw new Error('no es un archivo');
      }

      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache'
      });

      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('404 No encontrado');
    }
  });
}

/**
 * Levanta el servidor y espera a que esté escuchando.
 *
 * @param {string} rootDir carpeta que se publica
 * @param {Object} [options]
 * @param {number} [options.port] 0 para que el sistema elija uno libre
 * @param {string} [options.host]
 * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}
 */
export function startStaticServer(rootDir, { port = 0, host = '127.0.0.1' } = {}) {
  const server = createStaticServer(rootDir);

  return new Promise((resolve, reject) => {
    server.once('error', reject);

    server.listen(port, host, () => {
      const address = server.address();

      resolve({ server, port: address.port, url: `http://${host}:${address.port}` });
    });
  });
}
