/**
 * Servidor estático mínimo para autoalojar el modelador.
 *
 * Sin dependencias externas: solo módulos de Node.
 *
 * Uso:
 *   node app/serve.mjs [--port 3000] [--host 0.0.0.0]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

/**
 * @param {string} name
 * @param {string} fallback
 * @returns {string}
 */
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);

  return index === -1 ? fallback : args[index + 1];
}

const port = Number(arg('port', process.env.PORT || 3000));
const host = arg('host', process.env.HOST || '127.0.0.1');

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

const server = createServer(async (request, response) => {
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

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${port} ya está en uso. Cierra el proceso que lo ocupa o arranca en otro puerto:`);
    console.error(`  node app/serve.mjs --port ${port + 1}`);
  } else if (error.code === 'EACCES') {
    console.error(`Sin permisos para escuchar en ${host}:${port}. Prueba con un puerto por encima de 1024.`);
  } else {
    console.error(`No se pudo iniciar el servidor: ${error.message}`);
  }

  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Modelador BPMN disponible en http://${host}:${port}`);
  console.log('Pulsa Ctrl+C para detenerlo.');
});
