/**
 * Traducción de los mensajes de bpmnlint.
 *
 * Las reglas emiten sus mensajes en inglés y sin pasar por el servicio
 * `translate` de diagram-js, así que se traducen aquí.
 */

/** Mensajes fijos. */
const MESSAGES = {
  'A <Sequence Flow> outgoing from an <Event-based Gateway> must not be conditional':
    'Un flujo de secuencia que sale de una compuerta basada en eventos no puede tener condición',
  'A <Start Event> is not allowed in <Ad Hoc Sub Process>':
    'No se permite un evento de inicio dentro de un subproceso ad-hoc',
  'An <End Event> is not allowed in <Ad Hoc Sub Process>':
    'No se permite un evento de fin dentro de un subproceso ad-hoc',
  'An <Event-based Gateway> must have at least 2 outgoing <Sequence Flows>':
    'Una compuerta basada en eventos debe tener al menos 2 flujos de secuencia salientes',
  'Conditional event is missing a condition': 'El evento condicional no tiene condición',
  'Duplicate incoming sequence flows': 'Flujos de secuencia entrantes duplicados',
  'Duplicate outgoing sequence flows': 'Flujos de secuencia salientes duplicados',
  'Element is an implicit end': 'El elemento termina el flujo de forma implícita: le falta un evento de fin',
  'Element is an implicit start': 'El elemento inicia el flujo de forma implícita: le falta un evento de inicio',
  'Element is missing bpmndi': 'El elemento no tiene información de dibujo (bpmndi)',
  'Element is missing label/name': 'El elemento no tiene nombre',
  'Element is missing name': 'El elemento no tiene nombre',
  'Element is not connected': 'El elemento no está conectado',
  'Element is outside of parent boundary': 'El elemento se sale de los límites de su contenedor',
  'Element is unused': 'El elemento no se usa',
  'Element name is not unique': 'El nombre del elemento está repetido',
  'Element overlaps with other element': 'El elemento se solapa con otro',
  'Event has multiple event definitions': 'El evento tiene varias definiciones de evento',
  'Flow splits implicitly': 'El flujo se divide de forma implícita: usa una compuerta',
  'Gateway forks and joins': 'La compuerta divide y une a la vez: usa compuertas separadas',
  'Gateway is superfluous. It only has one source and target.':
    'La compuerta es innecesaria: solo tiene un origen y un destino',
  'Incoming flows do not join': 'Los flujos entrantes no se unen: falta una compuerta de unión',
  'Link event is missing link name': 'El evento de enlace no tiene nombre de enlace',
  'Process is missing end event': 'Al proceso le falta un evento de fin',
  'Process is missing start event': 'Al proceso le falta un evento de inicio',
  'Sequence flow is missing condition': 'El flujo de secuencia no tiene condición',
  'SequenceFlow is a duplicate': 'El flujo de secuencia está duplicado',
  'Start event is missing event definition': 'Al evento de inicio le falta la definición de evento',
  'Start event must be blank': 'El evento de inicio no debe tener definición de evento',
  'Termination is superfluous.': 'La terminación es innecesaria'
};

/**
 * Ámbitos que las reglas anteponen al mensaje ('Process is missing end event').
 */
const SCOPES = {
  'Process': 'el proceso',
  'Sub process': 'el subproceso',
  'Sub Process': 'el subproceso',
  'Event sub process': 'el subproceso de evento',
  'Ad hoc sub process': 'el subproceso ad-hoc',
  'Participant': 'el participante',
  'Collaboration': 'la colaboración'
};

/**
 * @param {string} type
 * @returns {string}
 */
function scopeName(type) {
  return SCOPES[type] || `el elemento «${type}»`;
}

/** Mensajes con partes variables. */
const PATTERNS = [
  [
    /^Duplicate link catch event with link name <(.+)> in scope$/,
    (_, name) => `Hay más de un evento de captura de enlace llamado «${name}» en este ámbito`
  ],
  [
    /^Link (catch|throw) event with link name <(.+)> missing in scope$/,
    (_, kind, name) => `Falta el evento de ${kind === 'catch' ? 'captura' : 'lanzamiento'} de enlace «${name}» en este ámbito`
  ],
  [
    /^Element type <(.+)> is discouraged$/,
    (_, type) => `No se recomienda usar el tipo de elemento <${type}>`
  ],
  [
    /^(.+) is missing (start|end) event$/,
    (_, scope, kind) => `A ${scopeName(scope)} le falta un evento de ${kind === 'start' ? 'inicio' : 'fin'}`
  ],
  [
    /^(.+) has multiple blank start events$/,
    (_, scope) => `${capitalize(scopeName(scope))} tiene varios eventos de inicio sin definición`
  ]
];

/**
 * @param {string} text
 * @returns {string}
 */
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Traduce el mensaje de una regla; si no se reconoce, lo devuelve tal cual.
 *
 * @param {string} message
 * @returns {string}
 */
export default function translateLintMessage(message) {
  if (MESSAGES[message]) {
    return MESSAGES[message];
  }

  for (const [ pattern, build ] of PATTERNS) {
    const match = message.match(pattern);

    if (match) {
      return build(...match);
    }
  }

  return message;
}
