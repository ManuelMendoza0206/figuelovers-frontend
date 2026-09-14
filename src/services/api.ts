import axios from 'axios';

import type {
  GraphPayloadSchema,
  GraphFileSchema,
  GraphImportData,
  SuccessResponse,
  GraphValidationData,
  DijkstraData,
  BfsData,
  JohnsonResultData,
  AssignmentPayload,
  AssignmentResultData,
} from '../types/graph';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_V1_PREFIX}`,
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

  runDijkstra: async (
    source: string, 
    target: string, 
    payload: GraphPayloadSchema
  ): Promise<SuccessResponse<DijkstraData>> => {
    const response = await apiClient.post<SuccessResponse<DijkstraData>>(
      '/graph/algorithms/dijkstra',
      payload,
      {
        params: { source, target },
      }
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
    payload: AssignmentPayload
  ): Promise<AssignmentResultData> => {
    const response = await apiClient.post<AssignmentResultData>(
      '/graph/algorithms/assignment',
      payload
    );
    return response.data;
  },
};