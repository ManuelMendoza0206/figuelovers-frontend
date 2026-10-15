import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { NorthwestResult } from '../types/graph';
import { useGraphStore } from '../store/useGraphStore';
import { createProject, getProject, saveProjectGraph } from '../utils/projectStorage';

const runNorthwest = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: { ...original.GraphServiceAPI, runNorthwest: (...args: unknown[]) => runNorthwest(...args) },
  };
});

vi.mock('../components/Sidebar', () => ({ Sidebar: () => null }));

const { default: NorthwestPage } = await import('./NorthwestPage');

const result: NorthwestResult = {
  allocation: [[5]],
  basic_cells: [{ cell: [0, 0], quantity: 5 }],
  total_cost: 20,
  steps: [{
    step: 1, cell: [0, 0], quantity: 5,
    supply_remaining: [0], demand_remaining: [0],
    closed: 'both', degenerate: false, note: 'Asignar el mínimo.',
    allocation: [[5]],
  }],
  was_balanced: true,
  dummy: null,
  uses_blocked_routes: false,
  blocked_used: [],
  warnings: [],
};

const mount = () => render(<MemoryRouter initialEntries={['/northwest']}><NorthwestPage /></MemoryRouter>);

beforeEach(() => {
  useGraphStore.getState().loadGraph(
    [
      { id: 'o', position: { x: 0, y: 0 }, data: { label: 'Origen', folio: 1, role: 'source', supply: 5 } },
      { id: 'd', position: { x: 100, y: 0 }, data: { label: 'Destino', folio: 2, role: 'sink', demand: 5 } },
    ],
    [{
      id: 'e', source: 'o', target: 'd', type: 'straight',
      data: { weight: 4, is_directed: true },
    }]
  );
  runNorthwest.mockReset();
  runNorthwest.mockResolvedValue(result);
});

afterEach(() => {
  cleanup();
  useGraphStore.getState().clearGraph();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('NorthwestPage', () => {
  it('shows graph costs, runs the request and displays allocations and steps', async () => {
    mount();
    expect(screen.getByText('4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Calcular solución inicial/ }));
    expect(await screen.findByText(/Costo total: 20/)).toBeTruthy();
    expect(screen.getByText(/Paso 1 de 1/)).toBeTruthy();
    expect(screen.queryByText(/Se añadió .* ficticio/)).toBeNull();
  });

  it('shows a dimmed fictitious destination only when the original totals differ', async () => {
    runNorthwest.mockResolvedValueOnce({
      ...result,
      allocation: [[5, 2]],
      basic_cells: [{ cell: [0, 0], quantity: 5 }, { cell: [0, 1], quantity: 2 }],
      was_balanced: false,
      dummy: { type: 'destination', index: 1, quantity: 2 },
    });
    mount();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Demanda de Destino' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Calcular solución inicial/ }));
    expect(await screen.findByText('Se añadió un destino ficticio (2) para balancear oferta y demanda.')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Destino ficticio' }).className).toContain('opacity-50');
  });

  it('shows blocked cells as shaded dashes in both matrices and leaves infeasible total cost empty', async () => {
    useGraphStore.getState().loadGraph(
      [
        { id: 'o', position: { x: 0, y: 0 }, data: { label: 'Origen', folio: 1, role: 'source', supply: 5 } },
        { id: 'd', position: { x: 100, y: 0 }, data: { label: 'Destino', folio: 2, role: 'sink', demand: 5 } },
      ],
      []
    );
    runNorthwest.mockResolvedValueOnce({
      ...result,
      allocation: [[5]],
      total_cost: null,
      was_balanced: true,
      uses_blocked_routes: true,
      blocked_used: [{ cell: [0, 0], origin: 'Origen', destination: 'Destino', quantity: 5 }],
    });
    mount();
    expect(screen.getAllByText('—')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Calcular solución inicial/ }));
    expect(await screen.findByText(/NO FACTIBLE/)).toBeTruthy();
    expect(screen.getByText('Costo total:')).toBeTruthy();
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(2);
    expect(dashes.every((dash) => dash.className.includes('bg-slate-700/60'))).toBe(true);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('hides a result when a supply input changes', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Calcular solución inicial/ }));
    await screen.findByText(/Costo total: 20/);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Oferta de Origen' }), { target: { value: '6' } });
    expect(screen.queryByText(/Costo total: 20/)).toBeNull();
  });

  it('shows a useful empty state if the store has no graph', () => {
    useGraphStore.getState().clearGraph();
    mount();
    expect(screen.getByText(/No hay un grafo cargado/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir editor' })).toBeTruthy();
  });

  it('persists edited role metadata when opened from a saved project', () => {
    const project = createProject('Transporte persistente');
    const state = useGraphStore.getState();
    saveProjectGraph(project.id, state.nodes, state.edges);
    render(
      <MemoryRouter initialEntries={[`/northwest?from=${encodeURIComponent(`/galaxy/${project.id}`)}`]}>
        <NorthwestPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Rol de Origen' }), { target: { value: 'none' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Rol de Origen' }), { target: { value: 'source' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Oferta de Origen' }), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Demanda de Destino' }), { target: { value: '6' } });
    const saved = getProject(project.id);
    expect(saved?.nodes[0].data).toMatchObject({ role: 'source', supply: 8 });
    expect(saved?.nodes[1].data).toMatchObject({ role: 'sink', demand: 6 });
  });
});
