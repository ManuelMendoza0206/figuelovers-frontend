import { create } from 'zustand';

import type { AppEdge, AppNode, JohnsonResultData } from '../types/graph';

/**
 * Resultado de Johnson que sobrevive a la navegacion.
 *
 * JohnsonPage calcula y despues lleva a la pizarra: si el resultado se
 * quedara en el estado local de la pagina, se perderia al desmontarla.
 * Este store conserva resultado, firma del grafo y extremos elegidos
 * para poder resaltar el camino en el canvas y mantener el panel
 * flotante mientras el grafo no cambie.
 */

export type JohnsonPanelMode = 'floating' | 'full';

interface JohnsonResultState {
  result: JohnsonResultData | null;
  graphSignature: string | null;
  source: string;
  target: string;
  panel: JohnsonPanelMode;
  setJohnsonResult: (
    result: JohnsonResultData,
    graphSignature: string,
    source: string,
    target: string
  ) => void;
  setJohnsonEndpoints: (source: string, target: string) => void;
  setJohnsonPanel: (panel: JohnsonPanelMode) => void;
  clearJohnsonResult: () => void;
}

/**
 * Firma del grafo tal como lo recibio Johnson. Solo importa la
 * topologia y los pesos: renombrar un nodo no cambia las distancias y
 * por lo tanto no invalida el resaltado.
 */
export const buildJohnsonGraphSignature = (
  nodes: AppNode[],
  edges: AppEdge[]
): string =>
  JSON.stringify({
    nodes: nodes.map((node) => node.id),
    edges: edges.map((edge) => [
      edge.source,
      edge.target,
      edge.data?.weight ?? null,
      edge.data?.is_directed ?? null,
    ]),
  });

export const isJohnsonResultFresh = (
  result: JohnsonResultData | null,
  resultSignature: string | null,
  nodes: AppNode[],
  edges: AppEdge[]
): result is JohnsonResultData =>
  result !== null &&
  resultSignature !== null &&
  resultSignature === buildJohnsonGraphSignature(nodes, edges);

/** Camino de nodos entre los extremos elegidos, o vacio si no hay. */
export const getJohnsonPath = (
  result: JohnsonResultData | null,
  source: string,
  target: string
): string[] => {
  if (!result || !source || !target) return [];
  return result.paths?.[source]?.[target] ?? [];
};

/**
 * Aristas del canvas que dibujan el camino.
 *
 * Johnson trabaja sobre aristas dirigidas, asi que se busca la arista
 * exacta source -> target de cada paso. Si hay varias, gana la primera:
 * el store no permite duplicados en la misma direccion dentro de la
 * sesion, pero un JSON importado podria traerlas.
 */
export const getJohnsonPathEdgeIds = (
  edges: AppEdge[],
  path: string[]
): string[] => {
  if (path.length < 2) return [];

  const edgeIds: string[] = [];

  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    const match = edges.find(
      (edge) => edge.source === from && edge.target === to
    );
    if (match) edgeIds.push(match.id);
  }

  return edgeIds;
};

export const useJohnsonResult = create<JohnsonResultState>((set) => ({
  result: null,
  graphSignature: null,
  source: '',
  target: '',
  panel: 'floating',

  setJohnsonResult: (result, graphSignature, source, target) => {
    set({
      result,
      graphSignature,
      source,
      target,
      panel: 'floating',
    });
  },

  setJohnsonEndpoints: (source, target) => {
    set({ source, target });
  },

  setJohnsonPanel: (panel) => {
    set({ panel });
  },

  clearJohnsonResult: () => {
    set({
      result: null,
      graphSignature: null,
      source: '',
      target: '',
      panel: 'floating',
    });
  },
}));
