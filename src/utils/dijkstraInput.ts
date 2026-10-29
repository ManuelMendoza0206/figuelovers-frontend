import type { AppEdge, AppNode, DijkstraPayload } from '../types/graph';
import { buildGraphPayload } from './graphFile';

/**
 * Entrada de Dijkstra desde el estado del editor.
 *
 * Utilidad PURA: arma el payload y valida en cliente antes de llamar al
 * backend, con el mismo criterio que el servicio (que igualmente
 * revalida). El objetivo es dos: fallar rápido sin red y poder mostrar
 * el aviso de "usa Johnson" con las aristas problemáticas listadas.
 *
 * Debe coincidir con MAX_DIJKSTRA_NODES del backend
 * (dijkstra_service.py).
 */
export const MAX_DIJKSTRA_NODES = 100;

/** Peso vacío cuenta como 1, igual que el esquema del backend. */
export const resolveEdgeWeight = (weight?: number | null): number =>
  weight ?? 1.0;

export interface NegativeEdgeInfo {
  id: string;
  /** Etiqueta visible del origen → destino, para listar en el aviso. */
  fromLabel: string;
  toLabel: string;
  weight: number;
}

export interface DijkstraClientValidation {
  /** Problemas que impiden o desaconsejan llamar al backend. */
  errors: string[];
  /** Aristas con peso < 0; si hay, el usuario debe ir a Johnson. */
  negativeEdges: NegativeEdgeInfo[];
}

const nodeLabel = (node: AppNode | undefined, id: string): string =>
  node?.data?.label?.trim() || id;

export const buildDijkstraPayload = (
  nodes: AppNode[],
  edges: AppEdge[],
  source: string,
  target?: string | null
): DijkstraPayload => ({
  graph: buildGraphPayload(nodes, edges),
  source,
  target: target ?? null,
});

export const validateDijkstraInput = (
  nodes: AppNode[],
  edges: AppEdge[],
  source: string
): DijkstraClientValidation => {
  const errors: string[] = [];
  const negativeEdges: NegativeEdgeInfo[] = [];

  if (nodes.length === 0) {
    errors.push('Añade nodos al grafo antes de calcular Dijkstra.');
    return { errors, negativeEdges };
  }

  if (!source) {
    errors.push('Selecciona un nodo origen.');
  }

  if (nodes.length > MAX_DIJKSTRA_NODES) {
    errors.push(
      `El grafo tiene ${nodes.length} nodos; el máximo para Dijkstra es ${MAX_DIJKSTRA_NODES}.`
    );
  }

  for (const edge of edges) {
    const weight = resolveEdgeWeight(edge.data?.weight);
    if (weight < 0) {
      negativeEdges.push({
        id: edge.id,
        fromLabel: nodeLabel(
          nodes.find((node) => node.id === edge.source),
          edge.source
        ),
        toLabel: nodeLabel(
          nodes.find((node) => node.id === edge.target),
          edge.target
        ),
        weight,
      });
    }
  }

  if (negativeEdges.length > 0) {
    errors.push(
      'Dijkstra no admite pesos negativos (aristas: ' +
        negativeEdges
          .map((edge) => `${edge.fromLabel} → ${edge.toLabel} (${edge.weight})`)
          .join(', ') +
        '). Usa Johnson, que sí soporta pesos negativos en grafos dirigidos.'
    );
  }

  return { errors, negativeEdges };
};
