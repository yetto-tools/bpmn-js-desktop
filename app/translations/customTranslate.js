import esTranslations from './es.js';

/**
 * Traduce una plantilla de diagram-js / bpmn-js al español, sustituyendo las
 * variables dinámicas del tipo {element}.
 *
 * @param {string} template
 * @param {Object<string, string>} [replacements]
 * @returns {string}
 */
export default function customTranslate(template, replacements) {
  replacements = replacements || {};

  const translated = esTranslations[template] || template;

  return translated.replace(/{([^}]+)}/g, function(_, key) {
    return replacements[key] !== undefined ? replacements[key] : '{' + key + '}';
  });
}
