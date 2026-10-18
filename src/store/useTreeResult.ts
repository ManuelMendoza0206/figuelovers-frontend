import { create } from 'zustand';

import type { TreeData, TreeOrder, TreeTraverseResult } from '../types/graph';

/**
 * Árbol de trabajo que sobrevive a la navegación.
 *
 * Antes el árbol y el recorrido vivían en el estado local de TreesPage:
 * salir a otra pestaña de algoritmos y volver los borraba. Este store
 * conserva valores insertados, árbol, orden elegido y visita en curso,
 * y además coordina los requests (una operación nueva cancela la
 * anterior) para que el panel lateral y el área principal compartan un
 * solo estado sin pisarse.
 */

export type TreeBuildMode = 'values' | 'random';

export interface TreeView {
  tree: TreeData;
  traversals: Record<TreeOrder, number[]>;
  isBst: boolean;
}

export const TREE_ORDERS: { id: TreeOrder; label: string }[] = [
  { id: 'preorder', label: 'Pre-order' },
  { id: 'inorder', label: 'In-order' },
  { id: 'postorder', label: 'Post-order' },
];

interface TreeResultState {
  mode: TreeBuildMode;
  values: number[];
  treeView: TreeView | null;
  order: TreeOrder;
  walk: TreeTraverseResult | null;
  walkIndex: number;
  loading: boolean;

  setMode: (mode: TreeBuildMode) => void;
  setValues: (values: number[]) => void;
  acceptBuiltTree: (treeView: TreeView) => void;
  setOrder: (order: TreeOrder) => void;
  setWalk: (walk: TreeTraverseResult | null) => void;
  setWalkIndex: (walkIndex: number) => void;
  resetTree: () => void;
  beginRequest: () => AbortController;
  finishRequest: (controller: AbortController) => void;
}

/**
 * Request en vuelo. Vive fuera del estado porque no es dato de render:
 * nadie se suscribe a él, solo se cancela o se compara al terminar.
 */
let activeRequest: AbortController | null = null;

const abortActiveRequest = (): void => {
  activeRequest?.abort();
  activeRequest = null;
};

export const useTreeResult = create<TreeResultState>((set) => ({
  mode: 'values',
  values: [],
  treeView: null,
  order: 'preorder',
  walk: null,
  walkIndex: 0,
  loading: false,

  setMode: (mode) => set({ mode }),

  setValues: (values) => set({ values }),

  /** Un árbol nuevo invalida la visita: el slider apuntaba a otro recorrido. */
  acceptBuiltTree: (treeView) => set({ treeView, walk: null, walkIndex: 0 }),

  /** Cambiar el orden descarta la visita: pertenecía al orden anterior. */
  setOrder: (order) => set({ order, walk: null, walkIndex: 0 }),

  setWalk: (walk) => set({ walk, walkIndex: 0 }),

  setWalkIndex: (walkIndex) => set({ walkIndex }),

  resetTree: () => {
    abortActiveRequest();
    set({ values: [], treeView: null, walk: null, walkIndex: 0, loading: false });
  },

  beginRequest: () => {
    abortActiveRequest();
    const controller = new AbortController();
    activeRequest = controller;
    set({ loading: true });
    return controller;
  },

  finishRequest: (controller) => {
    // Si otro request tomó el control, este `finally` es historia:
    // apagar `loading` acá dejaría al request vigente sin feedback.
    if (activeRequest !== controller) return;
    activeRequest = null;
    set({ loading: false });
  },
}));
