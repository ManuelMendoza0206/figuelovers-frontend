
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