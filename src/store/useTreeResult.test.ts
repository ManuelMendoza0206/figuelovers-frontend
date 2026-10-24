import { beforeEach, describe, expect, it } from 'vitest';

import type { TreeData, TreeTraverseResult } from '../types/graph';
import { useTreeResult, type TreeView } from './useTreeResult';

const tree: TreeData = {
  root_id: 'tree-2',
  nodes: [
    { id: 'tree-2', value: 2, left: 'tree-1', right: 'tree-3' },
    { id: 'tree-1', value: 1, left: null, right: null },
    { id: 'tree-3', value: 3, left: null, right: null },
  ],
  edges: [{ source: 'tree-2', target: 'tree-1' }, { source: 'tree-2', target: 'tree-3' }],
};

const treeView: TreeView = {
  tree,
  traversals: { preorder: [2, 1, 3], inorder: [1, 2, 3], postorder: [1, 3, 2] },
  isBst: true,
};

const walk: TreeTraverseResult = {
  order: 'postorder',
  visits: [
    { id: 'tree-1', value: 1 },
    { id: 'tree-3', value: 3 },
    { id: 'tree-2', value: 2 },
  ],
  node_ids: ['tree-1', 'tree-3', 'tree-2'],
  values: [1, 3, 2],
};

beforeEach(() => {
  // resetTree cancela cualquier request que haya quedado vivo entre tests.
  useTreeResult.getState().resetTree();
  useTreeResult.setState({ mode: 'values', order: 'preorder' });
});

describe('useTreeResult', () => {
  it('un árbol nuevo descarta la visita en curso', () => {
    const store = useTreeResult.getState();
    store.setWalk(walk);
    store.setWalkIndex(2);

    store.acceptBuiltTree(treeView);

    const state = useTreeResult.getState();
    expect(state.treeView).toBe(treeView);
    expect(state.walk).toBeNull();
    expect(state.walkIndex).toBe(0);
  });

  it('cambiar el orden descarta la visita porque pertenecía al orden anterior', () => {
    const store = useTreeResult.getState();
    store.setWalk(walk);
    store.setWalkIndex(2);

    store.setOrder('inorder');

    const state = useTreeResult.getState();
    expect(state.order).toBe('inorder');
    expect(state.walk).toBeNull();
    expect(state.walkIndex).toBe(0);
  });

  it('una visita nueva arranca en la primera parada', () => {
    const store = useTreeResult.getState();
    store.setWalkIndex(3);

    store.setWalk(walk);

    expect(useTreeResult.getState().walkIndex).toBe(0);
  });

  it('reiniciar cancela el request en vuelo y apaga el loading', () => {
    const controller = useTreeResult.getState().beginRequest();
    expect(useTreeResult.getState().loading).toBe(true);

    useTreeResult.getState().resetTree();

    expect(controller.signal.aborted).toBe(true);
    expect(useTreeResult.getState().loading).toBe(false);
    expect(useTreeResult.getState().values).toEqual([]);
  });

  it('un request nuevo cancela el anterior y el cierre viejo no apaga el loading', () => {
    const first = useTreeResult.getState().beginRequest();
    const second = useTreeResult.getState().beginRequest();

    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);

    // El `finally` del request cancelado llega tarde: no debe pisar el loading del vigente.
    useTreeResult.getState().finishRequest(first);
    expect(useTreeResult.getState().loading).toBe(true);

    useTreeResult.getState().finishRequest(second);
    expect(useTreeResult.getState().loading).toBe(false);
  });
});
