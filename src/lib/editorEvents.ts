/**
 * Eventos internos de la constelacion.
 *
 * El lienzo (GraphCanvas) es quien sabe que el usuario apretó "h" u "o",
 * pero la ayuda vive en el Navbar y el dialogo de "Limpiar todo" vive en
 * Navbar tambien. En vez de subir el estado de esos dos modales al store
 * (estado global que despues hay que reiniciar en cada test), el lienzo
 * pide la accion y cada componente la atiende donde ya vive su estado.
 *
 * El acople queda nombrado en un solo lugar: si mañana se cambia el
 * nombre del evento, hay un unico punto de verdad y el buscador lo
 * alcanza. Graficamente son "eventos de edicion", por eso el prefijo.
 */
export const EDITOR_EVENTS = {
  /** pide abrir el popover de ayuda (atajo H dentro del lienzo) */
  openHelp: 'figuelovers:open-help',
  /** pide abrir el dialogo de limpiar todo (atajo O dentro del lienzo) */
  requestClear: 'figuelovers:request-clear',
} as const;

export type EditorEvent = (typeof EDITOR_EVENTS)[keyof typeof EDITOR_EVENTS];

export const dispatchEditorEvent = (event: EditorEvent): void => {
  window.dispatchEvent(new CustomEvent(event));
};
