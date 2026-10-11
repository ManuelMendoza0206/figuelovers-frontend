import type { AppNode } from '../types/graph';

/**
 * Numeracion de folios.
 *
 * El folio es el identificador visible que el usuario ve en la matriz y
 * la lista de adyacencia. Es independiente del `id` interno (que es un
 * timestamp + random) justamente para que reorderar o recargar el lienzo
 * no cambie lo que el usuario ya leyo.
 *
 * Vive aparte del store porque es logica pura y testeable: no depende de
 * zustand ni de reactflow.
 */

const folioOf = (node: AppNode): number | undefined => {
  const folio = node.data?.folio;
  return typeof folio === 'number' && Number.isFinite(folio) ? folio : undefined;
};

/**
 * Proximo folio libre a partir de una lista de nodos.
 * Si no hay ninguno, arranca en 1.
 */
export const computeNextFolio = (nodes: AppNode[]): number => {
  const maxFolio = nodes.reduce((max, node) => {
    const folio = folioOf(node);
    return folio !== undefined && folio > max ? folio : max;
  }, 0);

  return maxFolio + 1;
};

/**
 * Completa los folios faltantes a partir de `startFolio`, sin tocar los
 * que ya vienen (JSON viejo o importado de otro formato).
 *
 * `computeNextFolio` se corre de nuevo sobre el resultado porque
 * completar folios consume numeros y el proximo libre quedo mas adelante.
 */
export const ensureFolios = (
  nodes: AppNode[],
  startFolio: number
): AppNode[] => {
  let nextFolio = startFolio;

  return nodes.map((node) => {
    if (folioOf(node) !== undefined) {
      return node;
    }

    const nodeWithFolio: AppNode = {
      ...node,
      data: {
        ...node.data,
        folio: nextFolio,
      },
    };

    nextFolio += 1;
    return nodeWithFolio;
  });
};