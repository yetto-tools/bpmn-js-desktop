/**
 * Servidor estático mínimo para autoalojar el modelador.
 *
 * Sin dependencias externas: solo módulos de Node.
 *
 * Uso:
 *   node app/serve.mjs [--port 3000] [--host 0.0.0.0]
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStaticServer } from './static-server.mjs';

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

const server = createStaticServer(rootDir);

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
