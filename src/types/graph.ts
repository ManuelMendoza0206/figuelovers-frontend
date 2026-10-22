
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

  nodos?: { id: string; data?: Record<string, unknown> | null }[];
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
  matrix: (number | null)[][];
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

export interface NorthwestPayload {
  costs: (number | null)[][];
  supply: number[];
  demand: number[];
  row_labels: string[];
  col_labels: string[];
}

export interface NorthwestBasicCell {
  cell: [number, number];
  quantity: number;
}

export interface NorthwestStep {
  step: number;
  cell: [number, number];
  quantity: number;
  supply_remaining: number[];
  demand_remaining: number[];
  closed: 'row' | 'column' | 'both';
  degenerate: boolean;
  note: string;
  allocation: number[][];
}

export interface NorthwestResult {
  allocation: number[][];
  basic_cells: NorthwestBasicCell[];
  total_cost: number | null;
  steps: NorthwestStep[];
  was_balanced: boolean;
  dummy: { type: 'origin' | 'destination'; index: number; quantity: number } | null;
  uses_blocked_routes: boolean;
  blocked_used: {
    cell: [number, number];
    origin: string;
    destination: string;
    quantity: number;
  }[];
  warnings: string[];
}

export type TreeOrder = 'preorder' | 'inorder' | 'postorder';

export interface TreeNodeData {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
}

export interface TreeEdgeData {
  source: string;
  target: string;
}

export interface TreeData {
  root_id: string | null;
  nodes: TreeNodeData[];
  edges: TreeEdgeData[];
}

export interface TreeBuildResult {
  tree: TreeData;
  traversals: Record<TreeOrder, number[]>;
}

export interface TreeTraverseResult {
  order: TreeOrder;
  visits: { id: string; value: number }[];
  node_ids: string[];
  values: number[];
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
  [key: string]: unknown;
  label: string;
  folio: number;
  role?: 'source' | 'sink' | 'none';
  supply?: number;
  demand?: number;
  treeValue?: number;
  treeSide?: 'left' | 'right';
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

/**
 * Herramienta activa del lienzo.
 *
 * Todas son modos, no acciones puntuales: el clic del usuario es lo que
 * finalmente ejecuta (añadir crea donde se hace clic; eliminar pide
 * confirmacion sobre lo que se hizo clic). 'add' y 'delete' existen porque
 * antes "añadir" metia un nodo en una posicion aleatoria y "eliminar"
 * vivia escondido en dos botones separados del panel lateral.
 */
export type GraphTool = 'interact' | 'connect' | 'add' | 'delete';