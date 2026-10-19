import { useEffect, useRef } from 'react';
import { isTypingTarget, matchesShortcut } from '../lib/keyboard';

/**
 * Suscribe un atajo de teclado al documento mientras el componente vive.
 *
 * Dos detalles que no son cosméticos:
 *
 *  - El handler vive en un ref y el listener se da de alta UNA vez. Si no,
 *    cualquier render (un drag del lienzo re-renderiza por frame) volveria
 *    a agregar y quitar el listener.
 *  - Se ignora cuando el foco esta en un campo de texto, asi un atajo nunca
 *    le roba letras a lo que el usuario esta escribiendo.
 *
 * `enabled` deja el atajo fuera de servicio sin desmontar nada (por
 * ejemplo, si la herramienta esta bloqueada en un contexto concreto).
 */
export const useDocumentShortcut = (
  key: string,
  handler: () => void,
  enabled = true
): void => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // key repeat: mantener la tecla apretada no debe alternar modos.
      if (event.repeat) return;
      if (!matchesShortcut(event, key)) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      handlerRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, enabled]);
};
