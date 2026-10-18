/**
 * Atajos de teclado.
 *
 * Atajo no es lo mismo que tecla: un atajo solo cuenta cuando el usuario
 * no esta escribiendo. Sin esta guarda, la "e" de una etiqueta o la "o"
 * de un nombre cambiarian de herramienta a mitad de la frase.
 */

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * true si el evento salio de un campo donde el usuario esta tipeando
 * (incluido contenteditable). Pura y sin dependencias del DOM real: se
 * puede testear con un objeto literal.
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof (target as Partial<Element>).tagName !== 'string') {
    return false;
  }

  const element = target as HTMLElement;

  if (TYPING_TAGS.has(element.tagName.toUpperCase())) return true;

  return element.isContentEditable === true;
};

/**
 * true si la tecla corresponde al atajo pedido y el evento no venia
 * combinada con Ctrl/Cmd/Alt (esas combinaciones le pertenecen al
 * navegador o al sistema operativo, no a nosotros).
 */
export const matchesShortcut = (
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  key: string
): boolean => {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;

  return event.key.toLowerCase() === key.toLowerCase();
};
