/**
 * Genera `app/vendor/properties-panel.js`, el bundle del panel de propiedades
 * que consume la aplicación autoalojada.
 *
 * Se ejecuta una sola vez (o tras actualizar el panel); la aplicación en sí no
 * necesita ningún paso de construcción.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const buildDir = dirname(fileURLToPath(import.meta.url));
const appDir = join(buildDir, '..');
const repoDir = join(appDir, '..');

const require = createRequire(import.meta.url);

/**
 * El panel importa utilidades de `bpmn-js` y `diagram-js`. Las resolvemos
 * contra el repositorio padre para no empaquetar una segunda copia de la
 * librería que ya sirve la aplicación.
 */
function useRepositoryModules() {
  return {
    name: 'use-repository-modules',
    resolveId(source) {
      if (/^(bpmn-js|diagram-js)\//.test(source)) {
        try {
          return require.resolve(source, { paths: [ repoDir ] });
        } catch {
          return null;
        }
      }

      return null;
    }
  };
}

/**
 * Estos paquetes publican sus hojas de estilo como recursos independientes,
 * no como importaciones desde el código; las copiamos junto a los bundles.
 *
 * @param {string[]} sources rutas de módulo de las hojas de estilo
 */
function copyStylesheets(sources) {
  return {
    name: 'copy-stylesheets',
    writeBundle() {
      for (const source of sources) {
        const resolved = require.resolve(source);
        const target = join(buildDir, 'out', source.split('/').pop());

        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(resolved, target);

        console.log(`copiada ${target.split(/[\\/]/).pop()}`);
      }
    }
  };
}

const shared = {
  plugins: [
    useRepositoryModules(),
    resolve({ preferBuiltins: false }),
    commonjs(),
    terser()
  ],
  onwarn(warning, warn) {

    // varias dependencias usan `this` en el ámbito de módulo
    if (warning.code === 'THIS_IS_UNDEFINED' || warning.code === 'CIRCULAR_DEPENDENCY') {
      return;
    }

    warn(warning);
  }
};

export default [

  // panel de propiedades
  {
    ...shared,
    input: join(buildDir, 'entry.js'),
    output: {
      format: 'iife',
      name: 'BpmnPropertiesPanel',
      file: join(buildDir, 'out', 'properties-panel.js'),
      globals: { 'bpmn-js': 'BpmnJS' }
    },
    plugins: [
      ...shared.plugins,
      copyStylesheets([ '@bpmn-io/properties-panel/dist/assets/properties-panel.css' ])
    ]
  },

  // validación (bpmnlint) y simulación de tokens
  {
    ...shared,
    input: join(buildDir, 'entry-tools.js'),
    output: {
      format: 'iife',
      name: 'BpmnTools',
      file: join(buildDir, 'out', 'bpmn-tools.js'),
      globals: { 'bpmn-js': 'BpmnJS' }
    },
    plugins: [
      ...shared.plugins,
      copyStylesheets([
        'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css',
        'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css',
        'bpmn-js-color-picker/colors/color-picker.css'
      ])
    ]
  },

  // exportación a PDF, cargada bajo demanda
  {
    ...shared,
    input: join(buildDir, 'entry-pdf.js'),
    output: {
      format: 'iife',
      name: 'BpmnPdf',
      file: join(buildDir, 'out', 'pdf-export.js'),

      // jsPDF carga módulos opcionales con import(); los incluimos en el bundle
      inlineDynamicImports: true
    }
  }
];
