import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import type { DijkstraResultData, GraphFileSchema } from '../types/graph';
import { useGraphStore } from '../store/useGraphStore';
import { graphPayloadToFlow } from '../utils/graphFile';

const runDijkstra = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: { ...original.GraphServiceAPI, runDijkstra: (...args: unknown[]) => runDijkstra(...args) },
  };
});

vi.mock('../components/Sidebar', () => ({ Sidebar: () => null }));

const { default: DijkstraPage } = await import('./DijkstraPage');

/** Grafo dirigido de prueba: A→B 4, A→C 1, C→B 2 (distancia B = 3). */
const loadTestGraph = () => {
  useGraphStore.getState().loadGraph(
    [
      { id: 'A', position: { x: 0, y: 0 }, data: { label: 'Alfa', folio: 1 } },
      { id: 'B', position: { x: 200, y: 0 }, data: { label: 'Beta', folio: 2 } },
      { id: 'C', position: { x: 100, y: 120 }, data: { label: 'Gama', folio: 3 } },
    ],
    [
      { id: 'eAB', source: 'A', target: 'B', type: 'straight', data: { weight: 4, is_directed: true } },
      { id: 'eAC', source: 'A', target: 'C', type: 'straight', data: { weight: 1, is_directed: true } },
      { id: 'eCB', source: 'C', target: 'B', type: 'straight', data: { weight: 2, is_directed: true } },
    ]
  );
};

const result: DijkstraResultData = {
  source: 'A',
  target: 'B',
  distances: { A: 0, B: 3, C: 1 },
  predecessors: { A: null, B: 'C', C: 'A' },
  paths: { A: ['A'], B: ['A', 'C', 'B'], C: ['A', 'C'] },
  order_visited: ['A', 'C', 'B'],
  steps: [
    {
      step: 1, node: 'A', distance: 0,
      relaxations: [
        { from: 'A', to: 'B', edge_id: 'eAB', old_distance: null, new_distance: 4, improved: true },
        { from: 'A', to: 'C', edge_id: 'eAC', old_distance: null, new_distance: 1, improved: true },
      ],
      distances_snapshot: { A: 0, B: 4, C: 1 },
      visited_snapshot: ['A'],
    },
    {
      step: 2, node: 'C', distance: 1,
      relaxations: [
        { from: 'C', to: 'B', edge_id: 'eCB', old_distance: 4, new_distance: 3, improved: true },
      ],
      distances_snapshot: { A: 0, B: 3, C: 1 },
      visited_snapshot: ['A', 'C'],
    },
    {
      step: 3, node: 'B', distance: 3,
      relaxations: [],
      distances_snapshot: { A: 0, B: 3, C: 1 },
      visited_snapshot: ['A', 'C', 'B'],
    },
  ],
  target_path: { nodes: ['A', 'C', 'B'], edges: ['eAC', 'eCB'], total_distance: 3 },
  warnings: [],
};

const mount = (entry = '/dijkstra') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <DijkstraPage />
    </MemoryRouter>
  );

const calcular = () =>
  fireEvent.click(screen.getByRole('button', { name: /Calcular caminos/ }));

beforeEach(() => {
  loadTestGraph();
  runDijkstra.mockReset();
  runDijkstra.mockResolvedValue(result);
});

afterEach(() => {
  cleanup();
  useGraphStore.getState().clearGraph();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('DijkstraPage', () => {
  it('runs the request with the selected origin and shows distances, path and steps', async () => {
    mount();
    await calcular();

    expect(await screen.findByText('Hasta Beta: 3')).toBeTruthy();
    expect(runDijkstra).toHaveBeenCalledTimes(1);

    const payload = runDijkstra.mock.calls[0][0] as {
      source: string;
      target: string | null;
      graph: { edges: { id: string }[] };
    };
    expect(payload.source).toBe('A');
    expect(payload.target).toBeNull(); // sin destino todavía
    expect(payload.graph.edges.map((edge) => edge.id)).toEqual(['eAB', 'eAC', 'eCB']);

    // Arranca en el último paso (3 de 3) y la tabla muestra el resultado.
    expect(screen.getByText(/Paso 3 de 3/)).toBeTruthy();
    expect(screen.getAllByText('Alfa → Gama → Beta').length).toBeGreaterThan(0);
    expect(screen.getByText('distancia total: 3')).toBeTruthy();
  });

  it('hides the result when the origin changes (signature) and can recalculate with a target', async () => {
    mount();
    await calcular();
    expect(await screen.findByText('Hasta Beta: 3')).toBeTruthy();

    // Cambiar el origen invalida el resultado sin tocar el store.
    fireEvent.change(screen.getByRole('combobox', { name: 'Nodo origen' }), {
      target: { value: 'C' },
    });
    expect(screen.queryByText('Hasta Beta: 3')).toBeNull();

    // Volver al origen y elegir destino: el próximo cálculo lo envía.
    fireEvent.change(screen.getByRole('combobox', { name: 'Nodo origen' }), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Nodo destino' }), {
      target: { value: 'B' },
    });
    await calcular();
    await screen.findByText('Hasta Beta: 3');
    const payload = runDijkstra.mock.calls.at(-1)?.[0] as { target: string | null };
    expect(payload.target).toBe('B');
  });

  it('hides the result when the graph is edited', async () => {
    mount();
    await calcular();
    await screen.findByText('Hasta Beta: 3');

    act(() => {
      useGraphStore.getState().updateEdgeData('eAB', 9, true);
    });
    expect(screen.queryByText('Hasta Beta: 3')).toBeNull();
  });

  it('shows the backend 400 message', async () => {
    runDijkstra.mockRejectedValueOnce({
      response: { data: { message: "El nodo origen 'Z' no existe en el grafo." } },
    });
    mount();
    await calcular();
    expect(await screen.findByText(/El nodo origen 'Z' no existe/)).toBeTruthy();
  });

  it('warns about negative weights before calling the backend and links to Johnson', () => {
    act(() => {
      useGraphStore.getState().updateEdgeData('eAB', -2, true);
    });
    mount();

    expect(screen.getByText(/Dijkstra no admite pesos negativos/)).toBeTruthy();
    const johnsonLink = screen.getByRole('link', { name: /Usar Johnson/ });
    // Sin ?from= explícito, el patrón vuelve al editor (igual que Johnson).
    expect(johnsonLink.getAttribute('href')).toBe('/johnson?from=%2Feditor');

    calcular();
    expect(runDijkstra).not.toHaveBeenCalled();
  });

  it('shows a useful empty state if the store has no graph', () => {
    useGraphStore.getState().clearGraph();
    mount();
    expect(screen.getByText(/No hay un grafo cargado/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir editor' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver proyectos' })).toBeTruthy();
  });

  it('walks the step slider and shows relaxations of that step', async () => {
    mount();
    await calcular();
    await screen.findByText('Hasta Beta: 3');

    fireEvent.click(screen.getByRole('button', { name: /← Anterior/ }));
    expect(screen.getByText(/Paso 2 de 3/)).toBeTruthy();
    // El texto del paso se parte en varios nodos (el nombre va en <strong>).
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === 'P' &&
          Boolean(node.textContent?.includes('Se fija')) &&
          Boolean(node.textContent?.includes('Gama'))
      )
    ).toBeTruthy();
    expect(screen.getByText(/4 → 3/)).toBeTruthy();
    expect(screen.getByText(/✓ mejoró/)).toBeTruthy();
  });

  it('runs on a real locked constellation without mutating the store shape', async () => {
    // Vitest corre con cwd en la raíz del frontend; en jsdom
    // import.meta.url no es un scheme file (mismo enfoque que
    // constellationCatalog.test.ts).
    const raw = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'public/constellations/osa-mayor.json'),
        'utf-8'
      )
    ) as GraphFileSchema;
    const { nodes, edges } = graphPayloadToFlow(raw.graph);
    useGraphStore.getState().loadConstellation('osa-mayor', nodes, edges);

    // Resultado con la forma real del backend para Osa Mayor (distancia 4).
    runDijkstra.mockResolvedValueOnce({
      ...result,
      source: 'dubhe',
      target: 'alkaid',
      distances: { dubhe: 0, alkaid: 4 },
      predecessors: { dubhe: null, alkaid: 'mizar' },
      paths: { dubhe: ['dubhe'], alkaid: ['dubhe', 'megrez', 'alioth', 'mizar', 'alkaid'] },
      order_visited: ['dubhe'],
      steps: [
        {
          step: 1, node: 'dubhe', distance: 0, relaxations: [],
          distances_snapshot: { dubhe: 0, alkaid: 4 },
          visited_snapshot: ['dubhe'],
        },
      ],
      target_path: {
        nodes: ['dubhe', 'megrez', 'alioth', 'mizar', 'alkaid'],
        edges: ['ursa-megrez-dubhe', 'ursa-megrez-alioth', 'ursa-alioth-mizar', 'ursa-mizar-alkaid'],
        total_distance: 4,
      },
      warnings: [],
    } satisfies DijkstraResultData);

    const shapeBefore = JSON.stringify({
      nodes: useGraphStore.getState().nodes.map((node) => [node.id, node.position]),
      edges: useGraphStore.getState().edges.map((edge) => [edge.id, edge.source, edge.target]),
    });

    render(
      <MemoryRouter initialEntries={['/dijkstra?from=%2Fgalaxy%2Fconst-1']}>
        <LocationProbe />
        <DijkstraPage />
      </MemoryRouter>
    );

    await calcular();
    await screen.findByText(/distancias desde Dubhe/);

    // El algoritmo solo LEE: la forma de la constelación no cambia.
    const shapeAfter = JSON.stringify({
      nodes: useGraphStore.getState().nodes.map((node) => [node.id, node.position]),
      edges: useGraphStore.getState().edges.map((edge) => [edge.id, edge.source, edge.target]),
    });
    expect(shapeAfter).toBe(shapeBefore);
    expect(useGraphStore.getState().structureLocked).toBe(true);

    // "?from=" regresa al proyecto de la constelación.
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/galaxy/const-1');
    });
  });
});

/** Muestra la ruta actual para poder asertar el "volver". */
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};
