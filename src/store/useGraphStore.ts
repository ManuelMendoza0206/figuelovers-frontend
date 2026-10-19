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

import type { GraphValidationData, AppNode, AppEdge, AppNodeData } from '../types/graph';

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

  /**
   * Bloqueo estructural: el grafo cargado es una constelación famosa,
   * así que su FORMA (nodos, posiciones y aristas) es fija.
   *
   * Vive en el store y no en la UI a proposito: un guard en un boton
   * se saltea con un atajo, con el teclado o llamando a la accion desde
   * otro lado. Acá rechazan addNode, deleteNode, deleteEdge, onConnect,
   * clearGraph, replaceGraph y los cambios de 'position'/'remove' de
   * onNodesChange/onEdgesChange.
   *
   * Lo que SIGUE permitido es lo que hace util una constelación:
   * renombrar estrellas (updateNodeData), pesos y direcciones de aristas
   * (updateEdgeData, reverseEdge, setAllEdgesDirected), seleccion,
   * zoom/paneo y el data de nodos que usan los algoritmos (roles,
   * oferta, demanda).
   */
  structureLocked: boolean;

  /** Plantilla de origen, solo cuando structureLocked es true. */
  constellationId: string | null;

  setStructureLocked: (locked: boolean, constellationId?: string | null) => void;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => boolean;
  deleteNode: (nodeId: string) => boolean;
  deleteEdge: (edgeId: string) => boolean;
  reverseEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, update: string | Partial<AppNodeData>) => void;

  updateEdgeData: (
    edgeId: string,
    weight: number,
    isDirected: boolean
  ) => void;

  /**
   * Pone todas las aristas en dirigidas o no dirigidas.
   *
   * Es lo que convierte una constelación en algo con lo que Johnson
   * pueda trabajar, y NO es una operación estructural: no agrega ni
   * quita aristas ni mueve nada, solo cambia el flag que ya se puede
   * editar arista por arista.
   */
  setAllEdgesDirected: (directed: boolean) => void;

  setValidationData: (
    data: GraphValidationData | null
  ) => void;

  setSelectedElement: (
    node: AppNode | null,
    edge: AppEdge | null
  ) => void;

  /** Grafo libre: carga y DESACTIVA el bloqueo. */
  loadGraph: (nodes: AppNode[], edges: AppEdge[]) => void;

  /** Constelación: carga y ACTIVA el bloqueo para ese id de plantilla. */
  loadConstellation: (
    constellationId: string,
    nodes: AppNode[],
    edges: AppEdge[]
  ) => void;

  /**
   * Reemplaza todo el grafo por otro (importar, "Enviar al editor").
   *
   * A diferencia de loadGraph, esto se RECHAZA en modo bloqueado: el
   * bloqueo solo lo levanta el flujo explícito de abrir un proyecto
   * libre, no un import ni un árbol que pisaría la constelación.
   */
  replaceGraph: (nodes: AppNode[], edges: AppEdge[]) => boolean;

  clearGraph: () => boolean;
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

/**
 * Estado resultante de reemplazar el grafo COMPLETO (con folios).
 *
 * Compartido por loadGraph, loadConstellation y replaceGraph: los tres
 * hacen lo mismo con el contenido, y lo único que difiere es si el
 * bloqueo queda activado o desactivado.
 */
const loadedGraphState = (
  nodes: AppNode[],
  edges: AppEdge[]
): Partial<GraphState> => {
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
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  nextFolio: 1,
  validationData: null,
  selectedNode: null,
  selectedEdge: null,
  structureLocked: false,
  constellationId: null,

  setStructureLocked: (locked, constellationId = null) => {
    set({
      structureLocked: locked,
      constellationId: locked ? constellationId : null,
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      // Bloqueado: solo sobrevive lo no estructural. 'select' marca una
      // estrella y 'dimensions' es la medicion interna de React Flow;
      // 'position' (mover) y 'remove' (borrar) se descartan aca aunque
      // alguien los llame por fuera de la UI.
      const allowedChanges = state.structureLocked
        ? changes.filter(
            (change) => change.type !== 'position' && change.type !== 'remove'
          )
        : changes;

      if (allowedChanges.length === 0) {
        return state;
      }

      const updatedNodes = applyNodeChanges(
        allowedChanges,
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
      // Igual que con los nodos: 'select' pasa, 'remove' y 'add' no.
      const allowedChanges = state.structureLocked
        ? changes.filter(
            (change) => change.type !== 'remove' && change.type !== 'add'
          )
        : changes;

      if (allowedChanges.length === 0) {
        return state;
      }

      const updatedEdges = applyEdgeChanges(
        allowedChanges,
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
      if (state.structureLocked) {
        return state;
      }

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
    if (get().structureLocked) {
      return false;
    }

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

    return true;
  },

  deleteNode: (nodeId) => {
    if (get().structureLocked) {
      return false;
    }

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

    return true;
  },

  deleteEdge: (edgeId) => {
    if (get().structureLocked) {
      return false;
    }

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

    return true;
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

  updateNodeData: (nodeId, update) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...(typeof update === 'string' ? { label: update } : update),
              },
            }
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

  setAllEdgesDirected: (directed) => {
    set((state) => {
      // Sin cambios: ni siquiera hay que romper la referencia del array.
      if (state.edges.every((edge) => edge.data?.is_directed === directed)) {
        return state;
      }

      return {
        edges: state.edges.map((edge) => ({
          ...edge,
          type: 'straight' as const,
          // La etiqueta es el peso: se conserva tal cual, solo cambia la
          // orientacion y el marcador de flecha.
          label: (edge.data?.weight ?? DEFAULT_WEIGHT).toString(),
          data: {
            ...edge.data,
            weight: edge.data?.weight ?? DEFAULT_WEIGHT,
            is_directed: directed,
          },
          markerEnd: directed ? createEdgeMarker() : undefined,
          style: createEdgeStyle(),
        })),
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
    // Camino libre: cargar un grafo normal (proyecto free, /editor)
    // desactiva cualquier bloqueo heredado de una constelacion previa.
    set({
      ...loadedGraphState(nodes, edges),
      structureLocked: false,
      constellationId: null,
    });
  },

  loadConstellation: (constellationId, nodes, edges) => {
    set({
      ...loadedGraphState(nodes, edges),
      structureLocked: true,
      constellationId,
    });
  },

  replaceGraph: (nodes, edges) => {
    // Importar o "Enviar al editor" no pueden pisar una constelacion:
    // eso cambiaria su forma. El bloqueo solo lo levanta el flujo de
    // abrir un proyecto (loadGraph) o el de restaurar original.
    if (get().structureLocked) {
      return false;
    }

    set(loadedGraphState(nodes, edges));
    return true;
  },

  clearGraph: () => {
    if (get().structureLocked) {
      return false;
    }

    set({
      nodes: [],
      edges: [],
      nextFolio: 1,
      validationData: null,
      selectedNode: null,
      selectedEdge: null,
      structureLocked: false,
      constellationId: null,
    });

    return true;
  },
}));