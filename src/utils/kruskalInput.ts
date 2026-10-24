import type { AppEdge, AppNode, KruskalObjective, KruskalPayload } from '../types/graph';
import { buildGraphPayload } from './graphFile';

/**
 * Entrada de Kruskal desde el estado del editor.
 *
 * Utilidad PURA: arma el payload y valida en cliente antes de llamar al
 * backend (que igualmente revalida). Detecta de paso si el grafo tiene
 * aristas dirigidas, para poder avisar que Kruskal ignora la dirección.
 *
 * Deben coincidir con los topes del backend (kruskal_service.py):
 * MAX_KRUSKAL_NODES y MAX_KRUSKAL_EDGES.
 */
export const MAX_KRUSKAL_NODES = 100;
export const MAX_KRUSKAL_EDGES = 500;

/** Peso vacío cuenta como 1, igual que el esquema del backend. */
export const resolveKruskalWeight = (weight?: number | null): number =>
  weight ?? 1.0;

export interface KruskalClientValidation {
  /** Problemas que impiden llamar al backend. */
  errors: string[];
  /** True si hay aristas dirigidas: se avisa que la dirección se ignora. */
  hasDirectedEdges: boolean;
  /** Pesos negativos o cero: válidos en Kruskal, pero se muestran. */
  unusualWeightEdgeIds: string[];
}

export const buildKruskalPayload = (
  nodes: AppNode[],
  edges: AppEdge[],
  objective: KruskalObjective
): KruskalPayload => ({
  graph: buildGraphPayload(nodes, edges),
  objective,
});

export const validateKruskalInput = (
  nodes: AppNode[],
  edges: AppEdge[]
): KruskalClientValidation => {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Añade nodos al grafo antes de calcular Kruskal.');
  } else if (nodes.length > MAX_KRUSKAL_NODES) {
    errors.push(
      `El grafo tiene ${nodes.length} nodos; el máximo para Kruskal es ${MAX_KRUSKAL_NODES}.`
    );
  }

  if (edges.length > MAX_KRUSKAL_EDGES) {
    errors.push(
      `El grafo tiene ${edges.length} aristas; el máximo para Kruskal es ${MAX_KRUSKAL_EDGES}.`
    );
  }

  return {
    errors,
    hasDirectedEdges: edges.some((edge) => edge.data?.is_directed === true),
    unusualWeightEdgeIds: edges
      .filter((edge) => resolveKruskalWeight(edge.data?.weight) <= 0)
      .map((edge) => edge.id),
  };
};
