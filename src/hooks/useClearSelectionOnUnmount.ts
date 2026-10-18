import { useEffect } from 'react';

import { useGraphStore } from '../store/useGraphStore';

/**
 * La selección pertenece al editor: al desmontarlo (navegar a árboles,
 * northwest, asignación o Johnson) se limpia para que el sidebar de la
 * pantalla siguiente no muestre el formulario de un elemento que ya no
 * está en pantalla.
 *
 * Se lee por `getState()` en la limpieza para no suscribir la página a
 * toda la selección; solo interesa el momento del desmontaje.
 */
export const useClearSelectionOnUnmount = (): void => {
  useEffect(
    () => () => {
      useGraphStore.getState().setSelectedElement(null, null);
    },
    []
  );
};
