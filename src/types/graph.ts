
export interface Position {
  x: number;
  y: number;
}

export interface NodeSchema {
  id: string;
  label?: string | null;
  position?: Position | null;
  data?: Record<string, unknown> | null;
}

export interface EdgeSchema {
  id: string;
  source: string;
  target: string;
  weight?: number | null;
  is_directed: boolean;
  label?: string | null;
}

export interface GraphPayloadSchema {
  nodes: NodeSchema[];
  edges: EdgeSchema[];
}

export interface SuccessResponse<T = Record<string, unknown>> {
  status: 'success';
  message: string;
  data?: T | null;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  details?: unknown | null;
}

export interface AdjacencyMatrixResponse {
  nodes: string[];
  matrix: number[][];
  is_directed: boolean;
}

export interface AdjacencyListItem {
  target: string;
  weight: number;
}

export interface GraphValidationData {
  estadisticas: {
    total_nodos: number;
    total_aristas: number;
    es_dirigido: boolean;
  };

  matriz_adyacencia: AdjacencyMatrixResponse;

  lista_adyacencia: Record<string, AdjacencyListItem[]>;
}

export interface DijkstraData {
  camino: string[];
  costo_total: number;
}

export interface BfsData {
  orden_recorrido: string[];
}

export interface JohnsonResultData {
  distances: Record<string, Record<string, number | null>>;
  paths: Record<string, Record<string, string[]>>;
  has_negative_cycle: boolean;
  message?: string;
}

export interface AssignmentAssignment {
  row: string;
  col: string;
  cost: number;
}

export interface AssignmentStepData {
  step: number;
  name: string;
  matrix: number[][];
  description: string;
  min_uncovered: number | null;
  /**
   * Pares [fila, columna] de la asignacion optima, en indices de la
   * matriz ORIGINAL (el backend ya filtra las celdas dummy del padding).
   * Solo viene en el paso final "Select Independent Zeros".
   */
  selected_zeros?: [number, number][] | null;
}

/**
 * Metadatos que el backend agrega cuando la matriz original es
   * rectangular y necesita padding para llegar a una cuadrada.
 * Sirve para no dibujar filas/columnas dummy como si fueran reales.
 */
export interface AssignmentPaddingInfo {
  original_rows: number;
  original_cols: number;
  padded_size: {
    rows: number;
    cols: number;
  };
  dummy_rows: number[];
  dummy_cols: number[];
}

export interface AssignmentResultData {
  assignments: AssignmentAssignment[];
  total_cost: number;
  initial_cost_matrix: number[][];
  steps: AssignmentStepData[];
  padding_info: AssignmentPaddingInfo | null;
}

export interface AssignmentPayload {
  cost_matrix: number[][];
  row_labels?: string[];
  col_labels?: string[];
  maximize?: boolean;
}

export interface GraphFileMetadata {
  version: string;
  name?: string | null;
  created_at?: string | null;
}

export interface GraphFileSchema {
  metadata: GraphFileMetadata;
  graph: GraphPayloadSchema;
}

export interface GraphImportData {
  metadata: GraphFileMetadata;
  graph: GraphPayloadSchema;
}

// ==========================================
// TIPOS DEL EDITOR (App)
// ==========================================

export interface AppNodeData {
  label: string;
  folio: number;
}

export interface AppEdgeData {
  weight: number;
  is_directed: boolean;
}

export type AppNode = import('reactflow').Node<AppNodeData>;
export type AppEdge = import('reactflow').Edge<AppEdgeData>;

// ==========================================
// HERRAMIENTAS DEL CANVAS
// ==========================================

export type GraphTool = 'interact' | 'connect';