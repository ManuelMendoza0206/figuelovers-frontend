import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from 'reactflow';

import type {
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';

import type { GraphValidationData, AppNodeData, AppEdgeData, AppNode, AppEdge } from '../types/graph';

export type { AppNodeData, AppEdgeData, AppNode, AppEdge };

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


const convertHandleDirection = (
  handleId: string | null | undefined,
  toType: 'source' | 'target'
): string | undefined => {
  if (!handleId) {
    return undefined;
  }

  if (handleId.startsWith('source-')) {
    return handleId.replace(
      'source-',
      `${toType}-`
    );
  }

  if (handleId.startsWith('target-')) {
    return handleId.replace(
      'target-',
      `${toType}-`
    );
  }

  return handleId;
};

// ==========================================
// Calcula el siguiente folio disponible a partir
// de una lista de nodos (usado al importar un grafo,
// por si ya traen folios asignados).
// ==========================================
const computeNextFolio = (nodes: AppNode[]): number => {
  const maxFolio = nodes.reduce((max, node) => {
    const folio = node.data?.folio;
    return typeof folio === 'number' && folio > max
      ? folio
      : max;
  }, 0);

  return maxFolio + 1;
};

const ensureFolios = (
  nodes: AppNode[],
  startFolio: number
): AppNode[] => {
  let nextFolio = startFolio;

  return nodes.map((node) => {
    if (typeof node.data?.folio === 'number') {
      return node;
    }

    const nodeWithFolio: AppNode = {
      ...node,
      data: {
        ...node.data,
        folio: nextFolio,
      },
    };

    nextFolio += 1;
    return nodeWithFolio;
  });
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

      const selectedNode =
        state.selectedNode !== null
          ? updatedNodes.find(
              (node) =>
                node.id === state.selectedNode?.id
            ) ?? null
          : null;

      return {
        nodes: updatedNodes,
        selectedNode,
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

      const selectedEdge =
        state.selectedEdge !== null
          ? updatedEdges.find(
              (edge) =>
                edge.id === state.selectedEdge?.id
            ) ?? null
          : null;

      return {
        edges: updatedEdges,
        selectedEdge,
        validationData: null,
      };
    });
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    const source = connection.source;
    const target = connection.target;

    set((state) => {
      const duplicateExists = state.edges.some(
        (edge) => {
          const sameDirection =
            edge.source === source &&
            edge.target === target;

          if (sameDirection) {
            return true;
          }

          const isLegacyUndirected =
            edge.data?.is_directed === false &&
            (
              (
                edge.source === source &&
                edge.target === target
              ) ||
              (
                edge.source === target &&
                edge.target === source
              )
            );

          return isLegacyUndirected;
        }
      );

      if (duplicateExists) {
        return state;
      }

      const newEdge: AppEdge = {
        id: `e-${source}-${target}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        type: 'straight',

        source,
        target,

        sourceHandle:
          connection.sourceHandle ?? undefined,

        targetHandle:
          connection.targetHandle ?? undefined,

        label: '1',

        data: {
          weight: 1,
          is_directed: true,
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },

        style: {
          stroke: '#05A8AA',
          strokeWidth: 2.5,
          zIndex: 10,
        },
      };

      const nextEdges = addEdge(
        newEdge,
        state.edges
      ) as AppEdge[];

      return {
        ...state,
        edges: nextEdges,
        validationData: null,
        selectedEdge: newEdge,
        selectedNode: null,
      };
    });
  },

  addNode: (position) => {
    const newId = `node-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

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

      const updatedNodes = state.nodes.filter(
        (node) => node.id !== nodeId
      );

      const updatedEdges = state.edges.filter(
        (edge) =>
          edge.source !== nodeId &&
          edge.target !== nodeId
      );

      const selectedNode =
        state.selectedNode?.id === nodeId
          ? null
          : state.selectedNode;

      const selectedEdge =
        state.selectedEdge &&
        (
          state.selectedEdge.source === nodeId ||
          state.selectedEdge.target === nodeId
        )
          ? null
          : state.selectedEdge;

      return {
        nodes: updatedNodes,
        edges: updatedEdges,
        selectedNode,
        selectedEdge,
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

      const selectedEdge =
        state.selectedEdge?.id === edgeId
          ? null
          : state.selectedEdge;

      return {
        edges: updatedEdges,
        selectedEdge,
        validationData: null,
      };
    });
  },

  reverseEdge: (edgeId) => {
    set((state) => {
      const edge = state.edges.find(
        (currentEdge) =>
          currentEdge.id === edgeId
      );

      if (!edge) {
        return state;
      }
      if (!edge.data?.is_directed) {
        return state;
      }

      const newSource = edge.target;
      const newTarget = edge.source;
      const oppositeExists = state.edges.some(
        (otherEdge) =>
          otherEdge.id !== edge.id &&
          otherEdge.source === newSource &&
          otherEdge.target === newTarget
      );

      if (oppositeExists) {
        return state;
      }

      const newSourceHandle =
        convertHandleDirection(
          edge.targetHandle,
          'source'
        );

      const newTargetHandle =
        convertHandleDirection(
          edge.sourceHandle,
          'target'
        );

      const reversedEdge: AppEdge = {
        ...edge,

        type: 'straight',

        source: newSource,
        target: newTarget,

        sourceHandle: newSourceHandle,
        targetHandle: newTargetHandle,

        data: {
          ...edge.data,
          is_directed: true,
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },

        style: {
          ...edge.style,
          stroke: '#05A8AA',
          strokeWidth: 2.5,
          zIndex: 10,
        },
      };

      const updatedEdges = state.edges.map(
        (currentEdge) =>
          currentEdge.id === edgeId
            ? reversedEdge
            : currentEdge
      );

      return {
        edges: updatedEdges,
        selectedEdge: reversedEdge,
        validationData: null,
      };
    });
  },


  updateNodeData: (nodeId, label) => {
    set((state) => {
      const updatedNodes = state.nodes.map(
        (node) => {
          if (node.id !== nodeId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              label,
            },
          };
        }
      );

      const updatedSelectedNode =
        state.selectedNode?.id === nodeId
          ? updatedNodes.find(
              (node) => node.id === nodeId
            ) ?? null
          : state.selectedNode;

      return {
        nodes: updatedNodes,
        selectedNode: updatedSelectedNode,
        validationData: null,
      };
    });
  },

  updateEdgeData: (
    edgeId,
    weight,
    isDirected
  ) => {
    set((state) => {
      const updatedEdges = state.edges.map(
        (edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          const updatedEdge: AppEdge = {
            ...edge,

            type: 'straight',

            label: weight.toString(),

            data: {
              ...edge.data,
              weight,
              is_directed: isDirected,
            },

            markerEnd: isDirected
              ? {
                  type: MarkerType.ArrowClosed,
                }
              : undefined,

            style: {
              ...edge.style,
              stroke: '#05A8AA',
              strokeWidth: 2.5,
              zIndex: 10,
            },
          };

          return updatedEdge;
        }
      );

      const updatedSelectedEdge =
        state.selectedEdge?.id === edgeId
          ? updatedEdges.find(
              (edge) => edge.id === edgeId
            ) ?? null
          : state.selectedEdge;

      return {
        edges: updatedEdges,
        selectedEdge: updatedSelectedEdge,
        validationData: null,
      };
    });
  },

  setValidationData: (data) => {
    set({
      validationData: data,
    });
  },
  setSelectedElement: (node, edge) => {
    set({
      selectedNode: node,
      selectedEdge: edge,
    });
  },

  loadGraph: (nodes, edges) => {
    set(() => {
      const initialNextFolio = computeNextFolio(nodes);
      const nodesWithFolio = ensureFolios(
        nodes,
        initialNextFolio
      );

      return {
        nodes: nodesWithFolio,
        edges,
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