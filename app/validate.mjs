/**
 * Valida archivos BPMN desde la línea de comandos con las mismas reglas que
 * aplica el modelador (`app/.bpmnlintrc`).
 *
 * Pensado para usarse antes de publicar un diagrama o dentro de un pipeline:
 * termina con código 1 si encuentra errores.
 *
 * Uso:
 *   node app/validate.mjs diagrama.bpmn [otro.bpmn ...]
 *   node app/validate.mjs --strict procesos/          (las advertencias también fallan)
 *   node app/validate.mjs --json diagrama.bpmn        (salida legible por máquina)
 */

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const repoDir = join(appDir, '..');
const buildDir = join(appDir, 'build');

const require = createRequire(import.meta.url);

const { default: translateLintMessage } = await import(
  pathToFileURL(join(appDir, 'translations', 'lint-es.js')).href
);

/**
 * Las dependencias de validación viven en `app/build`, igual que el bundle del
 * modelador, para no alterar las del repositorio.
 *
 * @param {string} id
 * @param {string} from
 * @returns {any}
 */
function loadModule(id, from) {
  try {
    return require(require.resolve(id, { paths: [ from ] }));
  } catch {
    return null;
  }
}

const Linter = loadModule('bpmnlint/lib/linter', buildDir);
const NodeResolver = loadModule('bpmnlint/lib/resolver/node-resolver', buildDir);

// bpmn-moddle se publica como módulo ES
const BpmnModdle = await (async () => {
  try {
    const path = require.resolve('bpmn-moddle', { paths: [ repoDir ] });

    const moddleModule = await import(pathToFileURL(path).href);

    return moddleModule.BpmnModdle || moddleModule.default;
  } catch (error) {
    console.error(`No se pudo cargar bpmn-moddle: ${error.message}`);

    return null;
  }
})();

if (!Linter || !NodeResolver) {
  console.error('Faltan las dependencias de validación.');
  console.error('Instálalas con: npm --prefix app/build install');
  process.exit(2);
}

if (!BpmnModdle) {
  console.error('No se encontró bpmn-moddle. Ejecuta `npm install` en la raíz del repositorio.');
  process.exit(2);
}

// #region argumentos

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const asJson = args.includes('--json');
const inputs = args.filter(arg => !arg.startsWith('--'));

if (!inputs.length) {
  console.error('Uso: node app/validate.mjs [--strict] [--json] <archivo.bpmn | carpeta> ...');
  process.exit(2);
}

// #endregion

/**
 * Expande carpetas a la lista de archivos .bpmn que contienen.
 *
 * @param {string[]} paths
 * @returns {Promise<string[]>}
 */
async function collectFiles(paths) {
  const files = [];

  for (const path of paths) {
    const absolute = resolve(path);

    if (statSync(absolute).isDirectory()) {
      const entries = await readdir(absolute, { withFileTypes: true, recursive: true });

      for (const entry of entries) {
        if (entry.isFile() && [ '.bpmn', '.xml' ].includes(extname(entry.name).toLowerCase())) {
          files.push(join(entry.parentPath || entry.path, entry.name));
        }
      }
    } else {
      files.push(absolute);
    }
  }

  return files;
}

const config = JSON.parse(await readFile(join(appDir, '.bpmnlintrc'), 'utf8'));

const linter = new Linter({
  config,
  resolver: new NodeResolver({ require: createRequire(join(buildDir, 'noop.js')) })
});

const moddle = new BpmnModdle();

/**
 * @param {string} file
 * @returns {Promise<{ file: string, errors: number, warnings: number, issues: Array<Object> }>}
 */
async function validateFile(file) {
  const xml = await readFile(file, 'utf8');

  let rootElement;

  try {
    ({ rootElement } = await moddle.fromXML(xml));
  } catch (error) {
    return {
      file,
      errors: 1,
      warnings: 0,
      issues: [ { category: 'error', message: `El archivo no es un BPMN válido: ${error.message}`, id: '' } ]
    };
  }

  const reports = await linter.lint(rootElement);

  const issues = Object.entries(reports).flatMap(([ rule, ruleReports ]) =>
    ruleReports.map(report => ({
      rule,
      id: report.id,
      category: report.category,
      message: translateLintMessage(report.message)
    }))
  );

  return {
    file,
    errors: issues.filter(issue => issue.category === 'error').length,
    warnings: issues.filter(issue => issue.category !== 'error').length,
    issues
  };
}

const files = await collectFiles(inputs);
const results = [];

for (const file of files) {
  results.push(await validateFile(file));
}

const totals = results.reduce((accumulator, result) => ({
  errors: accumulator.errors + result.errors,
  warnings: accumulator.warnings + result.warnings
}), { errors: 0, warnings: 0 });

if (asJson) {
  console.log(JSON.stringify({ files: results, totals }, null, 2));
} else {
  for (const result of results) {
    const name = relative(process.cwd(), result.file);

    if (!result.issues.length) {
      console.log(`\n${name}\n  sin problemas`);
      continue;
    }

    console.log(`\n${name}`);

    for (const issue of result.issues) {
      const label = issue.category === 'error' ? 'error ' : 'aviso ';
      const where = issue.id ? `  [${issue.id}]` : '';

      console.log(`  ${label} ${issue.message}${where}  (${issue.rule})`);
    }
  }

  console.log(
    `\n${files.length} archivo(s): ${totals.errors} error(es), ${totals.warnings} advertencia(s)`
  );
}

const failed = totals.errors > 0 || (strict && totals.warnings > 0);

process.exit(failed ? 1 : 0);
