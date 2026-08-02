/**
 * Copia el bundle de bpmn-js y sus recursos a `app/vendor/`.
 *
 * Así la carpeta `app/` queda autocontenida y se puede desplegar tal cual en
 * cualquier servidor web, sin acceso a internet ni a node_modules.
 *
 * Uso: node app/sync-vendor.mjs
 */

import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const vendorDir = join(appDir, 'vendor');

if (!existsSync(distDir)) {
  console.error(`No se encontró ${distDir}. Ejecuta antes: npm run distro`);
  process.exit(1);
}

await rm(vendorDir, { recursive: true, force: true });
await mkdir(vendorDir, { recursive: true });

const entries = [
  'bpmn-modeler.production.min.js',
  'bpmn-modeler.development.js',
  'assets'
];

for (const entry of entries) {
  await cp(join(distDir, entry), join(vendorDir, entry), { recursive: true });
  console.log(`copiado ${entry}`);
}

// panel de propiedades y herramientas de prueba, generados por `app/build`
const panelDir = join(appDir, 'build', 'out');
const panelFiles = [
  'properties-panel.js',
  'properties-panel.css',
  'bpmn-tools.js',
  'bpmn-js-bpmnlint.css',
  'bpmn-js-token-simulation.css',
  'color-picker.css',
  'pdf-export.js'
];

const missing = panelFiles.filter(file => !existsSync(join(panelDir, file)));

for (const file of panelFiles.filter(file => !missing.includes(file))) {
  await cp(join(panelDir, file), join(vendorDir, file));
  console.log(`copiado ${file}`);
}

if (missing.length) {
  console.warn(`\nAviso: faltan ${missing.length} archivo(s) generados: ${missing.join(', ')}`);
  console.warn('Genéralos con: npm --prefix app/build install && npm --prefix app/build run build');
}

console.log(`\nRecursos listos en ${vendorDir}`);
