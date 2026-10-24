import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGraphStore } from '../store/useGraphStore';
import { useTreeResult } from '../store/useTreeResult';
import type { TreeBuildResult, TreeData, TreeTraverseResult } from '../types/graph';
import { createProject, getProject } from '../utils/projectStorage';

const buildTree = vi.fn();
const traverseTree = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: {
      ...original.GraphServiceAPI,
      buildTree: (...args: unknown[]) => buildTree(...args),
      traverseTree: (...args: unknown[]) => traverseTree(...args),
    },
  };
});

/**
 * El constructor se mudó al sidebar. El mock deja pasar `children`
 * tal cual (el panel de árboles), así los tests siguen ejercitando la
 * página completa sin renderizar el sidebar de propiedades.
 */
vi.mock('../components/Sidebar', () => ({
  Sidebar: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
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
const walk: TreeTraverseResult = {
  order: 'postorder',
  visits: [{ id: 'tree-1', value: 1 }, { id: 'tree-3', value: 3 }, { id: 'tree-2', value: 2 }],
  node_ids: ['tree-1', 'tree-3', 'tree-2'],
  values: [1, 3, 2],
};
const mount = () => render(<MemoryRouter initialEntries={['/trees']}><TreesPage /></MemoryRouter>);

beforeEach(() => {
  useGraphStore.getState().clearGraph();
  useTreeResult.setState({
    mode: 'values',
    values: [],
    treeView: null,
    order: 'preorder',
    walk: null,
    walkIndex: 0,
    loading: false,
  });
  buildTree.mockReset().mockResolvedValue(built);
  traverseTree.mockReset().mockResolvedValue(walk);
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    // Los valores insertados van en un span mono: el matcher ve solo el nodo de texto directo.
    expect((await screen.findByText(/Insertados:/)).textContent).toContain('2');
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('inserts several values at once separated by commas', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '4, 2, 5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await screen.findByText(/Insertados:/);
    expect(buildTree).toHaveBeenCalledWith({ mode: 'values', values: [4, 2, 5] }, expect.any(AbortSignal));
    expect(screen.getByText(/Insertados:/).textContent).toContain('4, 2, 5');
  });

  it('inserts on Enter from the values input', async () => {
    mount();
    const input = screen.getByRole('textbox', { name: 'Valores' });
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await screen.findByText(/Insertados:/);
    expect(buildTree).toHaveBeenCalledWith({ mode: 'values', values: [7] }, expect.any(AbortSignal));
  });

  it('rejects a batch that repeats a value without inserting anything', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '3, 3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('repetido');
    expect(buildTree).not.toHaveBeenCalled();
  });

  it('generates a random tree with the requested count', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Aleatorio' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad de números' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar árbol' }));
    await screen.findByText('1 → 2 → 3');
    expect(buildTree).toHaveBeenCalledWith({ mode: 'random', count: 3 }, expect.any(AbortSignal));
  });

  it('runs the selected traversal and steps through the visits', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText('1 → 2 → 3');
    fireEvent.change(screen.getByRole('combobox', { name: 'Orden del recorrido' }), { target: { value: 'postorder' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recorrer' }));
    expect(await screen.findByText('1/3')).toBeTruthy();

    const drawing = screen.getByRole('img', { name: 'Dibujo del árbol binario' });
    expect(drawing.querySelectorAll('circle[fill="#f4c66a"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Visita siguiente' }));
    expect(screen.getByText('2/3')).toBeTruthy();
  });

  it('keeps the tree and the walk when leaving the page and coming back', async () => {
    const first = mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText(/Insertados:/);
    fireEvent.click(screen.getByRole('button', { name: 'Recorrer' }));
    await screen.findByText('1/3');
    first.unmount();

    mount();
    expect(screen.getByText(/Insertados:/).textContent).toContain('2');
    expect(screen.getByText('1 → 2 → 3')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Dibujo del árbol binario' })).toBeTruthy();
    expect(buildTree).toHaveBeenCalledTimes(1);
  });

  it('reinicia el árbol y vuelve al estado vacío', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText(/Insertados:/);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByText('Todavía no hay árbol')).toBeTruthy();
    expect(screen.queryByText(/Insertados:/)).toBeNull();
  });

  it('starts empty and saves tree metadata into the target project', async () => {
    const project = createProject('Árbol persistente');
    render(
      <MemoryRouter initialEntries={[`/trees?from=${encodeURIComponent(`/galaxy/${project.id}`)}`]}>
        <TreesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Todavía no hay árbol')).toBeTruthy();
    expect(screen.getByText(/Los recorridos aparecerán/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Valores' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await screen.findByText('1 → 2 → 3');
    fireEvent.click(screen.getByRole('button', { name: /Enviar al editor/ }));
    expect(getProject(project.id)?.nodes.some((node) => node.data.treeValue === 2)).toBe(true);
    expect(getProject(project.id)?.edges.every((edge) => edge.data?.is_directed)).toBe(true);
  });
});
