import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

import type {
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';

import {
  buildEdge,
  buildReversedEdge,
  createEdgeMarker,
  createEdgeStyle,
  createNodeId,
  DEFAULT_WEIGHT,
  hasConflictingEdge,
  hasReverseConflict,
} from '../lib/edgeFactory';
import { computeNextFolio, ensureFolios } from '../lib/folio';

import type { GraphValidationData, AppNode, AppEdge } from '../types/graph';

/**
 * Estado del lienzo.
 *
 * Este store solo coordina: cuando cambia el estado, re-resuelve la
 * seleccion y limpia `validationData` porque la validacion del backend
 * ya no corresponde al grafo actual.
 *
 * La logica que NO es coordinacion (folios, construccion/inversion de
 * aristas, deteccion de duplicados) vive en `lib/folio.ts` y
 * `lib/edgeFactory.ts`, ambas puras y testeadas por separado.
 */

interface GraphState {
  nodes: AppNode[];
  edges: AppEdge[];
  nextFolio: number;
  validationData: GraphValidationData | null;
  selectedNode: AppNode | null;
  selectedEdge: AppEdge | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  reverseEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, label: string) => void;

  updateEdgeData: (
    edgeId: string,
    weight: number,
    isDirected: boolean
  ) => void;

  setValidationData: (
    data: GraphValidationData | null
  ) => void;

  setSelectedElement: (
    node: AppNode | null,
    edge: AppEdge | null
  ) => void;

  loadGraph: (nodes: AppNode[], edges: AppEdge[]) => void;

  clearGraph: () => void;
}

/** Re-resuelve la seleccion tras un cambio en la coleccion. */
const keepSelection = <T extends { id: string }>(
  selected: T | null,
  updated: T[]
): T | null => {
  if (selected === null) {
    return null;
  }

  return updated.find((item) => item.id === selected.id) ?? null;
};

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  nextFolio: 1,
  validationData: null,
  selectedNode: null,
  selectedEdge: null,

  onNodesChange: (changes) => {
    set((state) => {
      const updatedNodes = applyNodeChanges(
        changes,
        state.nodes
      ) as AppNode[];

      return {
        nodes: updatedNodes,
        selectedNode: keepSelection(state.selectedNode, updatedNodes),
        // El grafo cambio => la validacion cacheada ya no aplica.
        validationData: null,
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const updatedEdges = applyEdgeChanges(
        changes,
        state.edges
      ) as AppEdge[];

      return {
        edges: updatedEdges,
        selectedEdge: keepSelection(state.selectedEdge, updatedEdges),
        validationData: null,
      };
    });
  },

  onConnect: (connection: Connection) => {
    const { source, target } = connection;

    if (!source || !target) {
      return;
    }

    set((state) => {
      if (hasConflictingEdge(state.edges, source, target)) {
        return state;
      }

      const newEdge = buildEdge({
        source,
        target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });

      return {
        edges: addEdge(newEdge, state.edges) as AppEdge[],
        validationData: null,
        selectedEdge: newEdge,
        selectedNode: null,
      };
    });
  },

  addNode: (position) => {
    const newId = createNodeId();

    set((state) => {
      const newNode: AppNode = {
        id: newId,
        position,
        data: {
          label: 'Nuevo Nodo',
          folio: state.nextFolio,
        },
      };

      return {
        nodes: [...state.nodes, newNode],
        nextFolio: state.nextFolio + 1,
        validationData: null,
        selectedNode: newNode,
        selectedEdge: null,
      };
    });
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const nodeExists = state.nodes.some(
        (node) => node.id === nodeId
      );

      if (!nodeExists) {
        return state;
      }

      return {
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        // Sin esto quedan aristas apuntando a un nodo inexistente.
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        selectedNode:
          state.selectedNode?.id === nodeId ? null : state.selectedNode,
        selectedEdge:
          state.selectedEdge &&
          (state.selectedEdge.source === nodeId ||
            state.selectedEdge.target === nodeId)
            ? null
            : state.selectedEdge,
        validationData: null,
      };
    });
  },

  deleteEdge: (edgeId) => {
    set((state) => {
      const edgeExists = state.edges.some(
        (edge) => edge.id === edgeId
      );

      if (!edgeExists) {
        return state;
      }

      const updatedEdges = state.edges.filter(
        (edge) => edge.id !== edgeId
      );

      return {
        edges: updatedEdges,
        selectedEdge:
          state.selectedEdge?.id === edgeId ? null : state.selectedEdge,
        validationData: null,
      };
    });
  },

  reverseEdge: (edgeId) => {
    set((state) => {
      const edge = state.edges.find(
        (currentEdge) => currentEdge.id === edgeId
      );

      if (!edge) {
        return state;
      }

      // Invertir una no dirigida no significa nada: no tiene orientation.
      if (!edge.data?.is_directed) {
        return state;
      }

      if (
        hasReverseConflict(state.edges, edgeId, edge.target, edge.source)
      ) {
        return state;
      }

      const reversedEdge = buildReversedEdge(edge);

      return {
        edges: state.edges.map((currentEdge) =>
          currentEdge.id === edgeId ? reversedEdge : currentEdge
        ),
        selectedEdge: reversedEdge,
        validationData: null,
      };
    });
  },

  updateNodeData: (nodeId, label) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      );

      return {
        nodes: updatedNodes,
        selectedNode: keepSelection(state.selectedNode, updatedNodes),
        validationData: null,
      };
    });
  },

  updateEdgeData: (edgeId, weight, isDirected) => {
    set((state) => {
      const updatedEdges = state.edges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        const nextWeight = Number.isFinite(weight) ? weight : DEFAULT_WEIGHT;

        return {
          ...edge,
          type: 'straight' as const,
          label: nextWeight.toString(),
          data: {
            ...edge.data,
            weight: nextWeight,
            is_directed: isDirected,
          },
          markerEnd: isDirected ? createEdgeMarker() : undefined,
          style: createEdgeStyle(),
        };
      });

      return {
        edges: updatedEdges,
        selectedEdge: keepSelection(state.selectedEdge, updatedEdges),
        validationData: null,
      };
    });
  },

  setValidationData: (data) => {
    set({ validationData: data });
  },

  setSelectedElement: (node, edge) => {
    set({ selectedNode: node, selectedEdge: edge });
  },

  loadGraph: (nodes, edges) => {
    set(() => {
      const nodesWithFolio = ensureFolios(nodes, computeNextFolio(nodes));

      return {
        nodes: nodesWithFolio,
        edges,
        // Recalculado: completar folios consumio numeros.
        nextFolio: computeNextFolio(nodesWithFolio),
        validationData: null,
        selectedNode: null,
        selectedEdge: null,
      };
    });
  },

  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      nextFolio: 1,
      validationData: null,
      selectedNode: null,
      selectedEdge: null,
    });
  },
}));