/**
 * Traducción de los controles del simulador de tokens.
 *
 * A diferencia del modelador y del panel de propiedades, este módulo no usa el
 * servicio `translate` de diagram-js: sus etiquetas están fijadas en el
 * código. Se sustituyen sobre el DOM mientras la simulación está activa.
 */

const LABELS = {
  'Trigger Event': 'Disparar evento',
  'Add pause point': 'Añadir punto de pausa',
  'Remove pause point': 'Quitar el punto de pausa',
  'Play/Pause Simulation': 'Reproducir o pausar la simulación',
  'Reset Simulation': 'Reiniciar la simulación',
  'Toggle Simulation Log': 'Mostrar u ocultar el registro',
  'Simulation Log': 'Registro de simulación',
  'No Entries': 'Sin entradas',
  'Set animation speed = Slow': 'Velocidad de animación: lenta',
  'Set animation speed = Normal': 'Velocidad de animación: normal',
  'Set animation speed = Fast': 'Velocidad de animación: rápida',
  'Token Simulation': 'Simulación de tokens'
};

/**
 * Traduce los títulos y textos del simulador dentro de un contenedor.
 *
 * @param {HTMLElement} container
 */
function localize(container) {
  for (const element of container.querySelectorAll('[title]')) {
    const translated = LABELS[element.getAttribute('title')];

    if (translated) {
      element.setAttribute('title', translated);
    }
  }

  for (const element of container.querySelectorAll('.bts-entry.placeholder, .bts-header')) {
    const translated = LABELS[element.textContent.trim()];

    if (translated) {
      element.textContent = translated;
    }
  }
}

/**
 * Mantiene traducidos los controles del simulador, incluidos los que aparecen
 * después (menús contextuales de cada elemento).
 *
 * @param {HTMLElement} container contenedor del modelador
 * @returns {() => void} función para dejar de observar
 */
export default function localizeSimulation(container) {
  localize(container);

  const observer = new MutationObserver(() => localize(container));

  observer.observe(container, { childList: true, subtree: true });

  return () => observer.disconnect();
}
