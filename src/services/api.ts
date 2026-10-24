import axios from 'axios';

import type {
  GraphPayloadSchema,
  GraphFileSchema,
  GraphImportData,
  SuccessResponse,
  GraphValidationData,
  DijkstraPayload,
  DijkstraResultData,
  BfsData,
  JohnsonResultData,
  AssignmentPayload,
  AssignmentResultData,
  NorthwestPayload,
  NorthwestResult,
  KruskalPayload,
  KruskalResultData,
  TreeBuildResult,
  TreeData,
  TreeOrder,
  TreeReconstructResult,
  TreeTraverseResult,
} from '../types/graph';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

/**
 * Tope de espera por request.
 *
 * Sin esto, si el backend acepta la conexion pero no responde (se
 * cuelga, se reinicia, un proxy se queda colgado), axios espera
 * indefinidamente y el usuario ve un spinner que nunca termina.
 */
const REQUEST_TIMEOUT_MS = 20_000;

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_V1_PREFIX}`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const GraphServiceAPI = {
  validateGraph: async (
    payload: GraphPayloadSchema
  ): Promise<SuccessResponse<GraphValidationData>> => {
    const response = await apiClient.post<SuccessResponse<GraphValidationData>>(
      '/graph/validate',
      payload
    );
    return response.data;
  },

  importGraph: async (
    file: GraphFileSchema
  ): Promise<SuccessResponse<GraphImportData>> => {
    const response = await apiClient.post<SuccessResponse<GraphImportData>>(
      '/graph/import',
      file
    );
    return response.data;
  },

  /**
   * Camino mínimo con origen único (Dijkstra real en el backend).
   *
   * El contrato del stub viejo (source/target como query params +
   * respuesta simulada) se reemplazó: todo va en el body y el backend
   * devuelve distancias, predecesores, caminos y la traza paso a paso.
   * `signal` permite abortar el request anterior al relanzar el cálculo
   * (mismo patrón que Assignment/Northwest).
   */
  runDijkstra: async (
    payload: DijkstraPayload,
    signal?: AbortSignal
  ): Promise<DijkstraResultData> => {
    const response = await apiClient.post<DijkstraResultData>(
      '/graph/algorithms/dijkstra',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },

  /**
   * Árbol de expansión mínima (o máxima) con Kruskal. El grafo se
   * trata como no dirigido en el backend; `signal` cancela la petición
   * anterior al relanzar el cálculo.
   */
  runKruskal: async (
    payload: KruskalPayload,
    signal?: AbortSignal
  ): Promise<KruskalResultData> => {
    const response = await apiClient.post<KruskalResultData>(
      '/graph/algorithms/kruskal',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },
  runBfs: async (
    startNode: string, 
    payload: GraphPayloadSchema
  ): Promise<SuccessResponse<BfsData>> => {
    const response = await apiClient.post<SuccessResponse<BfsData>>(
      '/graph/algorithms/bfs',
      payload,
      {
        params: { start_node: startNode }, 
      }
    );
    return response.data;
  },

  runJohnson: async (
    payload: GraphPayloadSchema
  ): Promise<JohnsonResultData> => {
    const response = await apiClient.post<JohnsonResultData>(
      '/graph/algorithms/johnson',
      payload
    );
    return response.data;
  },

  runAssignment: async (
    payload: AssignmentPayload,
    signal?: AbortSignal
  ): Promise<AssignmentResultData> => {
    const response = await apiClient.post<AssignmentResultData>(
      '/graph/algorithms/assignment',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },

  runNorthwest: async (
    payload: NorthwestPayload,
    signal?: AbortSignal
  ): Promise<NorthwestResult> => {
    const response = await apiClient.post<NorthwestResult>(
      '/graph/algorithms/northwest',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },

  buildTree: async (
    payload: { mode: 'values' | 'random'; values?: number[]; count?: number; seed?: number },
    signal?: AbortSignal
  ): Promise<TreeBuildResult> => {
    const response = await apiClient.post<TreeBuildResult>(
      '/graph/algorithms/tree/build',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },

  traverseTree: async (
    tree: TreeData,
    order: TreeOrder,
    signal?: AbortSignal
  ): Promise<TreeTraverseResult> => {
    const response = await apiClient.post<TreeTraverseResult>(
      '/graph/algorithms/tree/traverse',
      { tree, order },
      signal ? { signal } : undefined
    );
    return response.data;
  },

  reconstructTree: async (
    payload: { inorder: number[]; other: number[]; other_order: 'preorder' | 'postorder' },
    signal?: AbortSignal
  ): Promise<TreeReconstructResult> => {
    const response = await apiClient.post<TreeReconstructResult>(
      '/graph/algorithms/tree/reconstruct',
      payload,
      signal ? { signal } : undefined
    );
    return response.data;
  },
};

/**
 * Helper para abortar un request anterior cuando el usuario relanza el
 * calculo. Evita lacondition de carrera clasica: dos clicks rapidos
 * generan dos requests y el que responde ultimo gana, que no
 * necesariamente es el mas reciente.
 *
 * Axios ya propaga el AbortError; `isCanceled` permite distinguirlo de
 * un error real y no mostrar un toast por una cancelacion.
 */
export const isCanceled = (err: unknown): boolean =>
  axios.isCancel(err) ||
  (typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'ERR_CANCELED');