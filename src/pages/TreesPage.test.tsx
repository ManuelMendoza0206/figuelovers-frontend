import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeBuildResult, TreeData, TreeReconstructResult, TreeTraverseResult } from '../types/graph';
import { useGraphStore } from '../store/useGraphStore';
import { createProject, getProject } from '../utils/projectStorage';

const buildTree = vi.fn();
const traverseTree = vi.fn();
const reconstructTree = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: {
      ...original.GraphServiceAPI,
      buildTree: (...args: unknown[]) => buildTree(...args),
      traverseTree: (...args: unknown[]) => traverseTree(...args),
      reconstructTree: (...args: unknown[]) => reconstructTree(...args),
    },
  };
});

vi.mock('../components/Sidebar', () => ({ Sidebar: () => null }));
const { default: TreesPage } = await import('./TreesPage');

const tree: TreeData = {
  root_id: 'tree-2',
  nodes: [
    { id: 'tree-2', value: 2, left: 'tree-1', right: 'tree-3' },
    { id: 'tree-1', value: 1, left: null, right: null },
    { id: 'tree-3', value: 3, left: null, right: null },
  ],
  edges: [{ source: 'tree-2', target: 'tree-1' }, { source: 'tree-2', target: 'tree-3' }],
};
const traversals = { preorder: [2, 1, 3], inorder: [1, 2, 3], postorder: [1, 3, 2] };
const built: TreeBuildResult = { tree, traversals };
const reconstructed: TreeReconstructResult = { tree, traversals, is_bst: true };
const sevenNodeTree: TreeData = {
  root_id: 'tree-1',
  nodes: [
    { id: 'tree-1', value: 1, left: 'tree-2', right: 'tree-3' },
    { id: 'tree-2', value: 2, left: 'tree-4', right: 'tree-5' },
    { id: 'tree-4', value: 4, left: null, right: null },
    { id: 'tree-5', value: 5, left: null, right: null },
    { id: 'tree-3', value: 3, left: 'tree-6', right: 'tree-7' },
    { id: 'tree-6', value: 6, left: null, right: null },
    { id: 'tree-7', value: 7, left: null, right: null },
  ],
  edges: [
    { source: 'tree-1', target: 'tree-2' }, { source: 'tree-1', target: 'tree-3' },
    { source: 'tree-2', target: 'tree-4' }, { source: 'tree-2', target: 'tree-5' },
    { source: 'tree-3', target: 'tree-6' }, { source: 'tree-3', target: 'tree-7' },
  ],
};
const sevenNodeTraversals = {
  preorder: [1, 2, 4, 5, 3, 6, 7],
  inorder: [4, 2, 5, 1, 6, 3, 7],
  postorder: [4, 5, 2, 6, 7, 3, 1],
};
const sevenNodeReconstruction: TreeReconstructResult = {
  tree: sevenNodeTree,
  traversals: sevenNodeTraversals,
  is_bst: false,
};
const walk: TreeTraverseResult = { order: 'postorder', visits: [{ id: 'tree-1', value: 1 }, { id: 'tree-3', value: 3 }, { id: 'tree-2', value: 2 }], node_ids: ['tree-1', 'tree-3', 'tree-2'], values: [1, 3, 2] };
const mount = () => render(<MemoryRouter initialEntries={['/trees']}><TreesPage /></MemoryRouter>);

beforeEach(() => {
  useGraphStore.getState().clearGraph();
  buildTree.mockReset().mockResolvedValue(built);
  traverseTree.mockReset().mockResolvedValue(walk);
  reconstructTree.mockReset().mockResolvedValue(reconstructed);
});

afterEach(() => {
  cleanup();
  useGraphStore.getState().clearGraph();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('TreesPage', () => {
  it('adds a manual value and rejects a duplicate clearly', async () => {
    mount();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor entero' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('Insertados: 2')).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor entero' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('generates a random tree with the requested count', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Aleatorio' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad aleatoria' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar árbol' }));
    await screen.findByText(/In-order: 1 → 2 → 3/);
    expect(buildTree).toHaveBeenCalledWith({ mode: 'random', count: 3 }, expect.any(AbortSignal));
  });

  it('runs the selected traversal', async () => {
    mount();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor entero' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText(/In-order: 1 → 2 → 3/);
    fireEvent.change(screen.getByRole('combobox', { name: 'Orden del recorrido' }), { target: { value: 'postorder' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recorrer' }));
    expect(await screen.findByText(/Post-order: 1 → 3 → 2/)).toBeTruthy();
  });

  it.each([
    {
      title: 'reports exact discordant-value details',
      inorder: '4, 2, 5, 1, 3',
      other: '4, 5, 2, 9, 1',
      order: 'postorder',
      error: 'Los recorridos contienen valores distintos: solo en in-order: [3]; solo en postorder: [9].',
    },
    {
      title: 'reports different lengths',
      inorder: '1, 2',
      other: '1',
      order: 'preorder',
      error: 'Los recorridos deben tener la misma cantidad de valores.',
    },
    {
      title: 'reports duplicates within a traversal',
      inorder: '1, 1',
      other: '1, 1',
      order: 'preorder',
      error: 'La cadena in-order contiene valores repetidos: [1].',
    },
    {
      title: 'rejects non-numeric text locally',
      inorder: '1, x',
      other: '1, 2',
      order: 'preorder',
      error: '“x” no es un número entero válido.',
      local: true,
    },
    {
      title: 'rejects empty traversal strings locally',
      inorder: '',
      other: '',
      order: 'preorder',
      error: 'La cadena de recorrido no puede estar vacía.',
      local: true,
    },
    {
      title: 'reports incompatible traversal order',
      inorder: '1, 2, 3',
      other: '2, 3, 1',
      order: 'preorder',
      error: 'Los recorridos no son compatibles entre sí.',
    },
  ])('$title', async ({ inorder, other, order, error, local }) => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cadena in-order' }), { target: { value: inorder } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Otra cadena' }), { target: { value: other } });
    if (order === 'postorder') {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tipo del otro recorrido' }), { target: { value: order } });
    }
    if (!local) reconstructTree.mockRejectedValueOnce({ response: { data: { detail: error } } });
    fireEvent.click(screen.getByRole('button', { name: 'Construir árbol' }));
    expect((await screen.findByRole('alert')).textContent).toBe(error);
    expect(reconstructTree).toHaveBeenCalledTimes(local ? 0 : 1);
  });

  it('explains why pre-order plus post-order is not an accepted pair', () => {
    mount();
    expect(screen.getByText(
      'Reconstruye un árbol con in-order + pre-order o in-order + post-order. Pre-order + post-order no determina un árbol único y no se admite.'
    )).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Tipo del otro recorrido' }).querySelectorAll('option'))
      .toHaveLength(2);
  });

  it.each([
    { order: 'preorder', other: sevenNodeTraversals.preorder },
    { order: 'postorder', other: sevenNodeTraversals.postorder },
  ])('reconstructs and draws a seven-node tree from in-order plus $order', async ({ order, other }) => {
    reconstructTree.mockResolvedValueOnce(sevenNodeReconstruction);
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cadena in-order' }), {
      target: { value: sevenNodeTraversals.inorder.join(', ') },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo del otro recorrido' }), { target: { value: order } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Otra cadena' }), {
      target: { value: other.join(', ') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Construir árbol' }));
    expect(await screen.findByText(`Pre-order: ${sevenNodeTraversals.preorder.join(' → ')}`)).toBeTruthy();
    expect(screen.getByText(`In-order: ${sevenNodeTraversals.inorder.join(' → ')}`)).toBeTruthy();
    expect(screen.getByText(`Post-order: ${sevenNodeTraversals.postorder.join(' → ')}`)).toBeTruthy();
    const drawing = screen.getByRole('img', { name: 'Dibujo del árbol binario' });
    expect(drawing.querySelectorAll('circle')).toHaveLength(7);
    expect(drawing.querySelectorAll('line')).toHaveLength(6);
  });

  it('starts empty and saves tree metadata into the target project', async () => {
    const project = createProject('Árbol persistente');
    render(
      <MemoryRouter initialEntries={[`/trees?from=${encodeURIComponent(`/galaxy/${project.id}`)}`]}>
        <TreesPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Construye un árbol o carga uno/)).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor entero' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText(/In-order: 1 → 2 → 3/);
    fireEvent.click(screen.getByRole('button', { name: /Enviar al editor/ }));
    expect(getProject(project.id)?.nodes.some((node) => node.data.treeValue === 2)).toBe(true);
    expect(getProject(project.id)?.edges.every((edge) => edge.data?.is_directed)).toBe(true);
  });
});
