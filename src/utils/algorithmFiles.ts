import type { TreeView } from '../store/useTreeResult';
import type {
  GraphPayloadSchema,
  KruskalObjective,
  TreeOrder,
} from '../types/graph';
import {
  MAX_SORT_VALUE,
  MAX_SORT_VALUES,
  MIN_SORT_VALUE,
  MIN_SORT_VALUES,
  SORT_ALGORITHMS,
  type SortAlgorithm,
  type SortDirection,
} from './sortEngine';

/**
 * Archivos JSON de entrada para las pantallas de algoritmos.
 *
 * Guardamos el estado que el usuario necesita para volver a ejecutar el
 * algoritmo, no los resultados. Cada archivo lleva un encabezado con el
 * tipo de pantalla para rechazar un JSON que no corresponda.
 */

export type AlgorithmFileKind = 'sort' | 'trees' | 'assignment' | 'graph';

export interface AlgorithmFileMetadata {
  format: 'aristografos.algorithm';
  version: 1;
  kind: AlgorithmFileKind;
  created_at: string;
}

export interface AlgorithmFileEnvelope {
  metadata: AlgorithmFileMetadata;
  data: unknown;
}

export class AlgorithmFileError extends Error {}

const KIND_LABELS: Record<AlgorithmFileKind, string> = {
  sort: 'Sort',
  trees: 'Árboles',
  assignment: 'Asignación',
  graph: 'grafo',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isGraphPayload = (value: unknown): value is GraphPayloadSchema => {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return false;
  }

  const nodesValid = value.nodes.every((node) => {
    if (!isRecord(node) || typeof node.id !== 'string') return false;
    if (node.label !== undefined && node.label !== null && typeof node.label !== 'string') {
      return false;
    }
    if (node.data !== undefined && node.data !== null && !isRecord(node.data)) {
      return false;
    }
    if (node.position !== undefined && node.position !== null) {
      if (
        !isRecord(node.position) ||
        !isFiniteNumber(node.position.x) ||
        !isFiniteNumber(node.position.y)
      ) {
        return false;
      }
    }
    return true;
  });

  const edgesValid = value.edges.every((edge) => {
    if (
      !isRecord(edge) ||
      typeof edge.id !== 'string' ||
      typeof edge.source !== 'string' ||
      typeof edge.target !== 'string' ||
      typeof edge.is_directed !== 'boolean'
    ) {
      return false;
    }
    if (edge.weight !== undefined && edge.weight !== null && !isFiniteNumber(edge.weight)) {
      return false;
    }
    if (edge.label !== undefined && edge.label !== null && typeof edge.label !== 'string') {
      return false;
    }
    return true;
  });

  return nodesValid && edgesValid;
};

const isTreeOrder = (value: unknown): value is TreeOrder =>
  value === 'preorder' || value === 'inorder' || value === 'postorder';

const isTreeView = (value: unknown): value is TreeView => {
  if (!isRecord(value) || !isRecord(value.tree) || !isRecord(value.traversals)) {
    return false;
  }

  const tree = value.tree;
  if (
    (tree.root_id !== null && typeof tree.root_id !== 'string') ||
    !Array.isArray(tree.nodes) ||
    !Array.isArray(tree.edges)
  ) {
    return false;
  }

  const nodeIds = new Set<string>();
  for (const node of tree.nodes) {
    if (
      !isRecord(node) ||
      typeof node.id !== 'string' ||
      !isFiniteNumber(node.value) ||
      (node.left !== null && typeof node.left !== 'string') ||
      (node.right !== null && typeof node.right !== 'string')
    ) {
      return false;
    }
    nodeIds.add(node.id);
  }

  if (tree.root_id !== null && !nodeIds.has(tree.root_id)) return false;

  for (const node of tree.nodes) {
    if (
      (node.left !== null && !nodeIds.has(node.left as string)) ||
      (node.right !== null && !nodeIds.has(node.right as string))
    ) {
      return false;
    }
  }

  for (const edge of tree.edges) {
    if (
      !isRecord(edge) ||
      typeof edge.source !== 'string' ||
      typeof edge.target !== 'string' ||
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target)
    ) {
      return false;
    }
  }

  const traversals = value.traversals;
  for (const order of ['preorder', 'inorder', 'postorder'] as const) {
    const sequence = traversals[order];
    if (!Array.isArray(sequence) || !sequence.every(isFiniteNumber)) {
      return false;
    }
  }

  return typeof value.isBst === 'boolean';
};

export const createAlgorithmFile = (
  kind: AlgorithmFileKind,
  data: unknown
): AlgorithmFileEnvelope => ({
  metadata: {
    format: 'aristografos.algorithm',
    version: 1,
    kind,
    created_at: new Date().toISOString(),
  },
  data,
});

const normalizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim().replace(/\s+/g, '-');
  return /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`;
};

export const downloadAlgorithmFile = async (
  kind: AlgorithmFileKind,
  data: unknown,
  fileName: string
): Promise<void> => {
  const blob = new Blob([JSON.stringify(createAlgorithmFile(kind, data), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = normalizeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseAlgorithmText = (
  text: string,
  fileName: string,
  expectedKind: AlgorithmFileKind
): AlgorithmFileEnvelope => {
  if (!fileName.toLowerCase().endsWith('.json')) {
    throw new AlgorithmFileError('El archivo debe tener extensión .json.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AlgorithmFileError('El archivo no contiene un JSON válido.');
  }

  if (
    !isRecord(parsed) ||
    !isRecord(parsed.metadata) ||
    parsed.metadata.format !== 'aristografos.algorithm' ||
    parsed.metadata.version !== 1 ||
    typeof parsed.metadata.kind !== 'string' ||
    typeof parsed.metadata.created_at !== 'string'
  ) {
    throw new AlgorithmFileError(
      'El archivo no tiene el formato de entrada de un algoritmo.'
    );
  }

  if (parsed.metadata.kind !== expectedKind) {
    const sourceLabel =
      KIND_LABELS[parsed.metadata.kind as AlgorithmFileKind] ?? 'otro algoritmo';
    throw new AlgorithmFileError(
      `Este archivo es de ${sourceLabel}, no de ${KIND_LABELS[expectedKind]}.`
    );
  }

  return parsed as unknown as AlgorithmFileEnvelope;
};

export const parseAlgorithmFile = (
  file: File,
  expectedKind: AlgorithmFileKind
): Promise<AlgorithmFileEnvelope> =>
  new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(new AlgorithmFileError('El archivo debe tener extensión .json.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      reject(new AlgorithmFileError('No se pudo leer el archivo seleccionado.'));
    };
    reader.onload = () => {
      try {
        resolve(parseAlgorithmText(String(reader.result ?? ''), file.name, expectedKind));
      } catch (error: unknown) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });

export interface SortFileData {
  values: number[];
  algorithm: SortAlgorithm;
  direction: SortDirection;
}

export const readSortFileData = (raw: unknown): SortFileData => {
  if (!isRecord(raw) || !Array.isArray(raw.values)) {
    throw new AlgorithmFileError('El archivo no contiene una lista de números.');
  }

  if (
    raw.values.length < MIN_SORT_VALUES ||
    raw.values.length > MAX_SORT_VALUES ||
    !raw.values.every(
      (value) =>
        Number.isSafeInteger(value) &&
        value >= MIN_SORT_VALUE &&
        value <= MAX_SORT_VALUE
    )
  ) {
    throw new AlgorithmFileError(
      `La lista debe tener entre ${MIN_SORT_VALUES} y ${MAX_SORT_VALUES} enteros entre ${MIN_SORT_VALUE} y ${MAX_SORT_VALUE}.`
    );
  }

  if (
    typeof raw.algorithm !== 'string' ||
    !SORT_ALGORITHMS.some((entry) => entry.id === raw.algorithm)
  ) {
    throw new AlgorithmFileError('El archivo no indica un algoritmo de ordenamiento válido.');
  }

  // Archivos anteriores a la dirección guardada se interpretan como ascendentes.
  const direction = raw.direction === undefined ? 'asc' : raw.direction;
  if (direction !== 'asc' && direction !== 'desc') {
    throw new AlgorithmFileError('El archivo no indica una dirección de ordenamiento válida.');
  }

  return {
    values: raw.values as number[],
    algorithm: raw.algorithm as SortAlgorithm,
    direction,
  };
};

export interface AssignmentFileData {
  rows: number;
  cols: number;
  maximize: boolean;
  matrix: (number | null)[][];
  rowLabels: string[];
  colLabels: string[];
}

const MAX_ASSIGNMENT_DIMENSION = 20;

export const readAssignmentFileData = (raw: unknown): AssignmentFileData => {
  if (
    !isRecord(raw) ||
    !Number.isInteger(raw.rows) ||
    !Number.isInteger(raw.cols) ||
    typeof raw.maximize !== 'boolean' ||
    !Array.isArray(raw.matrix) ||
    !Array.isArray(raw.rowLabels) ||
    !Array.isArray(raw.colLabels)
  ) {
    throw new AlgorithmFileError('El archivo no contiene una matriz de asignación válida.');
  }

  const rows = raw.rows as number;
  const cols = raw.cols as number;
  if (rows < 1 || cols < 1 || rows > MAX_ASSIGNMENT_DIMENSION || cols > MAX_ASSIGNMENT_DIMENSION) {
    throw new AlgorithmFileError(
      `La matriz debe tener entre 1 y ${MAX_ASSIGNMENT_DIMENSION} filas y columnas.`
    );
  }

  if (
    raw.matrix.length !== rows ||
    raw.rowLabels.length !== rows ||
    raw.colLabels.length !== cols ||
    !raw.rowLabels.every((label) => typeof label === 'string') ||
    !raw.colLabels.every((label) => typeof label === 'string')
  ) {
    throw new AlgorithmFileError('Las dimensiones y las etiquetas del archivo no coinciden.');
  }

  const matrix = raw.matrix;
  if (
    !matrix.every(
      (row) =>
        Array.isArray(row) &&
        row.length === cols &&
        row.every((cell) => cell === null || isFiniteNumber(cell))
    )
  ) {
    throw new AlgorithmFileError('La matriz contiene celdas que no son números.');
  }

  return {
    rows,
    cols,
    maximize: raw.maximize,
    matrix: matrix as (number | null)[][],
    rowLabels: raw.rowLabels as string[],
    colLabels: raw.colLabels as string[],
  };
};

export interface TreeFileData {
  values: number[];
  order: TreeOrder;
  treeView: TreeView | null;
}

export const readTreeFileData = (raw: unknown): TreeFileData => {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.values) ||
    !raw.values.every((value) => Number.isSafeInteger(value)) ||
    !isTreeOrder(raw.order) ||
    (raw.treeView !== null && !isTreeView(raw.treeView))
  ) {
    throw new AlgorithmFileError('El archivo no contiene un estado de árbol válido.');
  }

  if (new Set(raw.values).size !== raw.values.length) {
    throw new AlgorithmFileError('El archivo contiene valores repetidos en el árbol.');
  }

  return {
    values: raw.values as number[],
    order: raw.order,
    treeView: raw.treeView as TreeView | null,
  };
};

export interface GraphAlgorithmFileData {
  graph: GraphPayloadSchema;
  source?: string;
  target?: string;
  objective?: KruskalObjective;
}

export const readGraphAlgorithmFileData = (raw: unknown): GraphAlgorithmFileData => {
  if (!isRecord(raw) || !isGraphPayload(raw.graph)) {
    throw new AlgorithmFileError('El archivo no contiene un grafo válido.');
  }

  const data: GraphAlgorithmFileData = { graph: raw.graph };

  if (raw.source !== undefined) {
    if (typeof raw.source !== 'string') {
      throw new AlgorithmFileError('El origen guardado no es válido.');
    }
    data.source = raw.source;
  }

  if (raw.target !== undefined) {
    if (typeof raw.target !== 'string') {
      throw new AlgorithmFileError('El destino guardado no es válido.');
    }
    data.target = raw.target;
  }

  if (raw.objective !== undefined) {
    if (raw.objective !== 'min' && raw.objective !== 'max') {
      throw new AlgorithmFileError('El objetivo guardado no es válido.');
    }
    data.objective = raw.objective;
  }

  return data;
};
