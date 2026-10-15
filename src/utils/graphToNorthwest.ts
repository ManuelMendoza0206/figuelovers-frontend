import type { AppNodeData } from '../types/graph';

export type TransportRole = 'source' | 'sink' | 'none';

export interface TransportNode {
  id: string;
  label?: string | null;
  data?: Partial<AppNodeData> | null;
}

export interface TransportEdge {
  source: string;
  target: string;
  weight?: number | null;
  isDirected?: boolean;
}

export interface NorthwestTranslation {
  origins: { id: string; label: string; supply: number }[];
  destinations: { id: string; label: string; demand: number }[];
  costs: (number | null)[][];
  roles: Record<string, TransportRole>;
  ignoredEdges: string[];
  warnings: string[];
}

const labelOf = (node: TransportNode): string =>
  node.label?.trim() || node.data?.label?.trim() || node.id;

const inferRoles = (
  nodes: TransportNode[],
  edges: TransportEdge[]
): Record<string, TransportRole> => {
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outdegree = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    if (edge.isDirected !== true && edge.source !== edge.target) {
      outdegree.set(edge.target, (outdegree.get(edge.target) ?? 0) + 1);
      indegree.set(edge.source, (indegree.get(edge.source) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    nodes.map((node) => {
      const explicitRole = node.data?.role;
      const role =
        explicitRole === 'source' || explicitRole === 'sink' || explicitRole === 'none'
          ? explicitRole
          : (outdegree.get(node.id) ?? 0) > 0 && (indegree.get(node.id) ?? 0) === 0
            ? 'source'
            : (indegree.get(node.id) ?? 0) > 0 && (outdegree.get(node.id) ?? 0) === 0
              ? 'sink'
              : 'none';
      return [node.id, role];
    })
  );
};

export const translateGraphToNorthwest = (
  nodes: TransportNode[],
  edges: TransportEdge[]
): NorthwestTranslation => {
  const roles = inferRoles(nodes, edges);
  const origins = nodes
    .filter((node) => roles[node.id] === 'source')
    .map((node) => ({
      id: node.id,
      label: labelOf(node),
      supply: node.data?.supply ?? 0,
    }));
  const destinations = nodes
    .filter((node) => roles[node.id] === 'sink')
    .map((node) => ({
      id: node.id,
      label: labelOf(node),
      demand: node.data?.demand ?? 0,
    }));
  const costs = origins.map(() => destinations.map(() => null as number | null));
  const originIndex = new Map(origins.map((origin, index) => [origin.id, index]));
  const destinationIndex = new Map(
    destinations.map((destination, index) => [destination.id, index])
  );
  const ignoredEdges: string[] = [];

  for (const edge of edges) {
    let from = edge.source;
    let to = edge.target;
    let row = originIndex.get(from);
    let col = destinationIndex.get(to);

    if (edge.isDirected !== true && row === undefined && col === undefined) {
      from = edge.target;
      to = edge.source;
      row = originIndex.get(from);
      col = destinationIndex.get(to);
    }

    if (row === undefined || col === undefined) {
      ignoredEdges.push(`${edge.source} → ${edge.target}`);
      continue;
    }

    costs[row][col] =
      typeof edge.weight === 'number' && Number.isFinite(edge.weight)
        ? edge.weight
        : 1;
  }

  const noneLabels = nodes
    .filter((node) => roles[node.id] === 'none')
    .map(labelOf);
  const warnings = [];
  if (noneLabels.length > 0) {
    warnings.push(
      `Los nodos ${noneLabels.join(', ')} tienen rol “ninguno” y no participan; no se modelan transbordos.`
    );
  }
  if (ignoredEdges.length > 0) {
    warnings.push(
      `Se ignoraron ${ignoredEdges.length} arista(s) que no conectan un origen con un destino en el sentido permitido.`
    );
  }

  return { origins, destinations, costs, roles, ignoredEdges, warnings };
};
