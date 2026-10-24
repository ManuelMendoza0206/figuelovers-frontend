import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import type { GraphFileSchema, KruskalResultData } from '../types/graph';
import { useGraphStore } from '../store/useGraphStore';
import { graphPayloadToFlow } from '../utils/graphFile';

const runKruskal = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: { ...original.GraphServiceAPI, runKruskal: (...args: unknown[]) => runKruskal(...args) },
  };
});

vi.mock('../components/Sidebar', () => ({ Sidebar: () => null }));

const { default: KruskalPage } = await import('./KruskalPage');

/**
 * Grafo no dirigido del enunciado: A-B 1, B-C 2, A-C 3, C-D 4, B-D 5,
 * D-E 6, C-E 7 => aceptan AB, BC, CD, DE; total 13.
 */
const loadTestGraph = (directed = false) => {
  useGraphStore.getState().loadGraph(
    [
      { id: 'A', position: { x: 0, y: 0 }, data: { label: 'Alfa', folio: 1 } },
      { id: 'B', position: { x: 200, y: 0 }, data: { label: 'Beta', folio: 2 } },
      { id: 'C', position: { x: 100, y: 120 }, data: { label: 'Gama', folio: 3 } },
      { id: 'D', position: { x: 300, y: 120 }, data: { label: 'Delta', folio: 4 } },
      { id: 'E', position: { x: 400, y: 0 }, data: { label: 'Épsilon', folio: 5 } },
    ],
    [
      { id: 'eAB', source: 'A', target: 'B', type: 'straight', data: { weight: 1, is_directed: directed } },
      { id: 'eBC', source: 'B', target: 'C', type: 'straight', data: { weight: 2, is_directed: directed } },
      { id: 'eAC', source: 'A', target: 'C', type: 'straight', data: { weight: 3, is_directed: directed } },
      { id: 'eCD', source: 'C', target: 'D', type: 'straight', data: { weight: 4, is_directed: directed } },
      { id: 'eBD', source: 'B', target: 'D', type: 'straight', data: { weight: 5, is_directed: directed } },
      { id: 'eDE', source: 'D', target: 'E', type: 'straight', data: { weight: 6, is_directed: directed } },
      { id: 'eCE', source: 'C', target: 'E', type: 'straight', data: { weight: 7, is_directed: directed } },
    ]
  );
};

const edge = (id: string, source: string, target: string, weight: number) => ({
  id,
  source,
  target,
  weight,
});

const fullComponent = [['A', 'B', 'C', 'D', 'E']];

const result: KruskalResultData = {
  mst_edges: [edge('eAB', 'A', 'B', 1), edge('eBC', 'B', 'C', 2), edge('eCD', 'C', 'D', 4), edge('eDE', 'D', 'E', 6)],
  total_weight: 13,
  components: 1,
  is_connected: true,
  sorted_edges: ['eAB', 'eBC', 'eAC', 'eCD', 'eBD', 'eDE', 'eCE'],
  steps: [
    { step: 1, edge: edge('eAB', 'A', 'B', 1), decision: 'accepted', reason: 'une dos componentes distintos.', components_snapshot: [['A', 'B'], ['C'], ['D'], ['E']], total_weight_so_far: 1 },
    { step: 2, edge: edge('eBC', 'B', 'C', 2), decision: 'accepted', reason: 'une dos componentes distintos.', components_snapshot: [['A', 'B', 'C'], ['D'], ['E']], total_weight_so_far: 3 },
    { step: 3, edge: edge('eAC', 'A', 'C', 3), decision: 'rejected', reason: 'formaría un ciclo: sus extremos ya están en el mismo componente.', components_snapshot: [['A', 'B', 'C'], ['D'], ['E']], total_weight_so_far: 3 },
    { step: 4, edge: edge('eCD', 'C', 'D', 4), decision: 'accepted', reason: 'une dos componentes distintos.', components_snapshot: [['A', 'B', 'C', 'D'], ['E']], total_weight_so_far: 7 },
    { step: 5, edge: edge('eBD', 'B', 'D', 5), decision: 'rejected', reason: 'formaría un ciclo: sus extremos ya están en el mismo componente.', components_snapshot: [['A', 'B', 'C', 'D'], ['E']], total_weight_so_far: 7 },
    { step: 6, edge: edge('eDE', 'D', 'E', 6), decision: 'accepted', reason: 'une dos componentes distintos.', components_snapshot: fullComponent, total_weight_so_far: 13 },
    { step: 7, edge: edge('eCE', 'C', 'E', 7), decision: 'rejected', reason: 'formaría un ciclo: sus extremos ya están en el mismo componente.', components_snapshot: fullComponent, total_weight_so_far: 13 },
  ],
  ignored_directions: false,
  warnings: [],
};

const mount = (entry = '/kruskal') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <KruskalPage />
    </MemoryRouter>
  );

const calcular = () =>
  fireEvent.click(screen.getByRole('button', { name: /Calcular árbol/ }));

beforeEach(() => {
  loadTestGraph();
  runKruskal.mockReset();
  runKruskal.mockResolvedValue(result);
});

afterEach(() => {
  cleanup();
  useGraphStore.getState().clearGraph();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('KruskalPage', () => {
  it('runs with objective min and shows total, accepted edges and the processing order', async () => {
    mount();
    await calcular();

    expect(await screen.findByText(/Peso total: 13/)).toBeTruthy();
    expect(runKruskal).toHaveBeenCalledTimes(1);

    const payload = runKruskal.mock.calls[0][0] as {
      objective: string;
      graph: { edges: { id: string }[] };
    };
    expect(payload.objective).toBe('min');
    expect(payload.graph.edges.map((item) => item.id)).toEqual([
      'eAB', 'eBC', 'eAC', 'eCD', 'eBD', 'eDE', 'eCE',
    ]);

    expect(screen.getByText(/Paso 7 de 7/)).toBeTruthy();
    expect(screen.getByText(/1 componente/)).toBeTruthy();

    // Lista completa con decisiones y motivos (la 4ª "rechazada" es la leyenda).
    expect(screen.getAllByText('aceptada')).toHaveLength(4);
    expect(screen.getAllByText('rechazada')).toHaveLength(4);
    // 3 motivos en la lista + 1 en el panel del paso actual.
    expect(screen.getAllByText(/formaría un ciclo/).length).toBe(4);

    // Arista del último paso rechazada con su motivo, en la lista.
    expect(screen.getByText('7. Gama — Épsilon (7)')).toBeTruthy();
  });

  it('hides the result when the objective changes and sends it on recalculation', async () => {
    mount();
    await calcular();
    await screen.findByText(/Peso total: 13/);

    fireEvent.change(screen.getByRole('combobox', { name: 'Objetivo' }), {
      target: { value: 'max' },
    });
    expect(screen.queryByText(/Peso total: 13/)).toBeNull();

    await calcular();
    await screen.findByText(/Peso total: 13/);
    const payload = runKruskal.mock.calls.at(-1)?.[0] as { objective: string };
    expect(payload.objective).toBe('max');
  });

  it('hides the result when the graph is edited', async () => {
    mount();
    await calcular();
    await screen.findByText(/Peso total: 13/);

    act(() => {
      useGraphStore.getState().updateEdgeData('eAB', 5, false);
    });
    expect(screen.queryByText(/Peso total: 13/)).toBeNull();
  });

  it('shows the backend error message', async () => {
    runKruskal.mockRejectedValueOnce({
      response: { data: { message: 'El grafo tiene 501 aristas; Kruskal admite hasta 500 aristas.' } },
    });
    mount();
    await calcular();
    expect(await screen.findByText(/admite hasta 500 aristas/)).toBeTruthy();
  });

  it('shows the forest banner when the graph is disconnected', async () => {
    runKruskal.mockResolvedValueOnce({
      ...result,
      is_connected: false,
      components: 2,
      warnings: [
        'El grafo es desconexo: el resultado es un bosque de expansión con 2 componentes (un árbol por componente), no un único árbol.',
      ],
    });
    mount();
    await calcular();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getAllByText(/bosque de expansión con 2 componentes/).length).toBeGreaterThan(0);
    // Chip del resumen + banner: ambos hablan de los componentes.
    expect(screen.getAllByText(/2 componentes/).length).toBeGreaterThan(0);
  });

  it('warns that directed edges are ignored before calling the backend', async () => {
    loadTestGraph(true);
    mount();

    expect(
      screen.getAllByText(/Kruskal ignora la dirección de las aristas/).length
    ).toBeGreaterThan(0);

    await calcular();
    await screen.findByText(/Peso total: 13/);
    expect(runKruskal).toHaveBeenCalledTimes(1);
  });

  it('shows a useful empty state if the store has no graph', () => {
    useGraphStore.getState().clearGraph();
    mount();
    expect(screen.getByText(/No hay un grafo cargado/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir editor' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver proyectos' })).toBeTruthy();
  });

  it('runs on a real locked constellation without mutating the store shape', async () => {
    const raw = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'public/constellations/osa-mayor.json'),
        'utf-8'
      )
    ) as GraphFileSchema;
    const { nodes, edges } = graphPayloadToFlow(raw.graph);
    useGraphStore.getState().loadConstellation('osa-mayor', nodes, edges);

    // MST real de Osa Mayor: 6 aristas de peso 1 (n-1), total 6.
    runKruskal.mockResolvedValueOnce({
      ...result,
      mst_edges: [
        edge('ursa-dubhe-merak', 'dubhe', 'merak', 1),
        edge('ursa-merak-phecda', 'merak', 'phecda', 1),
        edge('ursa-phecda-megrez', 'phecda', 'megrez', 1),
        edge('ursa-megrez-alioth', 'megrez', 'alioth', 1),
        edge('ursa-alioth-mizar', 'alioth', 'mizar', 1),
        edge('ursa-mizar-alkaid', 'mizar', 'alkaid', 1),
      ],
      total_weight: 6,
      components: 1,
      is_connected: true,
      steps: [],
      warnings: [],
    } satisfies KruskalResultData);

    const shapeBefore = JSON.stringify({
      nodes: useGraphStore.getState().nodes.map((node) => [node.id, node.position]),
      edges: useGraphStore.getState().edges.map((edgeItem) => [
        edgeItem.id,
        edgeItem.source,
        edgeItem.target,
      ]),
    });

    render(
      <MemoryRouter initialEntries={['/kruskal?from=%2Fgalaxy%2Fconst-1']}>
        <LocationProbe />
        <KruskalPage />
      </MemoryRouter>
    );

    await calcular();
    await screen.findByText(/Peso total: 6/);

    const shapeAfter = JSON.stringify({
      nodes: useGraphStore.getState().nodes.map((node) => [node.id, node.position]),
      edges: useGraphStore.getState().edges.map((edgeItem) => [
        edgeItem.id,
        edgeItem.source,
        edgeItem.target,
      ]),
    });
    expect(shapeAfter).toBe(shapeBefore);
    expect(useGraphStore.getState().structureLocked).toBe(true);

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
