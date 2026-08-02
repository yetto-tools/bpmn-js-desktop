/**
 * Copia la aplicación web dentro de `desktop/web`, que es lo que se empaqueta.
 *
 * Se excluye todo lo que solo hace falta para construir (dependencias de
 * `build/`, scripts de servidor por línea de comandos), pero se conserva
 * `vendor/`, que es lo que la aplicación necesita para funcionar.
 *
 * La carpeta no puede llamarse `app`: electron-builder reserva ese nombre para
 * el directorio de la aplicación y buscaría ahí un punto de entrada propio.
 *
 * Uso: node prepare-app.mjs
 */

import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(desktopDir, '..', 'app');
const targetDir = join(desktopDir, 'web');

if (!existsSync(join(sourceDir, 'vendor'))) {
  console.error('Falta app/vendor. Genera los recursos antes:');
  console.error('  npm --prefix app/build run build && npm run app:sync');
  process.exit(1);
}

/** Rutas que no tienen sentido dentro del paquete. */
const EXCLUDED = [
  'build', 'serve.mjs', 'validate.mjs', 'sync-vendor.mjs',
  'package.json', '.gitignore', '.bpmnlintrc'
];

await rm(targetDir, { recursive: true, force: true });

await cp(sourceDir, targetDir, {
  recursive: true,
  filter: source => {
    const path = relative(sourceDir, source);

    if (!path) {
      return true;
    }

    const [ first ] = path.split(sep);

    return !EXCLUDED.includes(first);
  }
});

console.log(`aplicación copiada a ${targetDir}`);
