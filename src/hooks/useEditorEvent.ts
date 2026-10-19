import { useEffect, useRef } from 'react';
import type { EditorEvent } from '../lib/editorEvents';

/**
 * Escucha un evento interno de la constelacion (ver `lib/editorEvents`).
 *
 * Mismo patron que `useDocumentShortcut`: el handler va a un ref para que
 * el listener no se re-registre en cada render. Asi el componente puede
 * escribir handlers con closures frescas (leyendo su propio estado) sin
 * pagar una baja/alta de listener por render.
 */
export const useEditorEvent = (
  event: EditorEvent,
  handler: () => void
): void => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const onEditorEvent = () => handlerRef.current();

    window.addEventListener(event, onEditorEvent);
    return () => window.removeEventListener(event, onEditorEvent);
  }, [event]);
};
