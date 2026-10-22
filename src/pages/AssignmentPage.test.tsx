import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssignmentResultData } from '../types/graph';
import { useAssignmentStore } from '../store/useAssignmentStore';

/**
 * Regresion de un bug real: AssignmentPage dejaba el resultado en
 * pantalla cuando el usuario cambiaba algo despues de calcular.
 *
 * El caso masVisible: calcular, editar una celda, y quedarse viendo la
 * asignacion optima de la matriz ANTERIOR como si fuera la actual.
 */

const runAssignment = vi.fn();

vi.mock('../services/api', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    GraphServiceAPI: {
      runAssignment: (...args: unknown[]) => runAssignment(...args),
      runJohnson: vi.fn(),
      validateGraph: vi.fn(),
      importGraph: vi.fn(),
    },
  };
});

// El Sidebar arrastra reactflow y no aporta a este test.
vi.mock('../components/Sidebar', () => ({
  Sidebar: () => null,
}));

const { default: AssignmentPage } = await import('./AssignmentPage');

const resultado: AssignmentResultData = {
  assignments: [
    { row: 'Trabajador 1', col: 'Tarea A', cost: 4 },
    { row: 'Trabajador 2', col: 'Tarea B', cost: 5 },
    { row: 'Trabajador 3', col: 'Tarea C', cost: 6 },
  ],
  total_cost: 15,
  initial_cost_matrix: [
    [4, 2, 8],
    [4, 5, 6],
    [7, 3, 6],
  ],
  steps: [
    {
      step: 1,
      name: 'Row Reduction',
      matrix: [
        [0, 0, 4],
        [0, 1, 2],
        [4, 0, 3],
      ],
      description: 'Se resta el minimo de cada fila.',
      min_uncovered: null,
    },
    {
      step: 2,
      name: 'Select Independent Zeros',
      matrix: [
        [0, 0, 4],
        [0, 1, 2],
        [4, 0, 3],
      ],
      description: 'Zeros independientes.',
      min_uncovered: null,
      selected_zeros: [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
    },
  ],
  padding_info: null,
};

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/assignment']}>
      <AssignmentPage />
    </MemoryRouter>
  );

const calcular = () =>
  fireEvent.click(screen.getByRole('button', { name: /calcular asignación/i }));

const hayResultado = () =>
  screen.queryByText(/resultado de la misión/i) !== null;

beforeEach(() => {
  useAssignmentStore.getState().reset();
  runAssignment.mockReset();
  runAssignment.mockResolvedValue(resultado);
});

afterEach(() => {
  // Con `globals: false` en vite.config no hay auto-cleanup.
  cleanup();
  useAssignmentStore.getState().reset();
  vi.clearAllMocks();
});

describe('AssignmentPage - el resultado nunca queda obsoleto', () => {
  it('muestra el resultado despues de calcular', async () => {
    montar();

    calcular();

    expect(await screen.findByText(/resultado de la misión/i)).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('OCULTA el resultado al editar una celda', async () => {
    montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);
    expect(hayResultado()).toBe(true);

    // Editamos la primera celda de la matriz de entrada.
    const celda = document.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement;
    fireEvent.change(celda, { target: { value: '99' } });

    expect(
      hayResultado(),
      'el resultado de la matriz anterior no debe seguir en pantalla'
    ).toBe(false);
  });

  it('OCULTA el resultado al cambiar el objetivo (minimize <-> maximize)', async () => {
    montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'maximize' },
    });

    expect(
      hayResultado(),
      'un resultado de minimize no puede quedar mostrado bajo "maximizar"'
    ).toBe(false);
  });

  it('OCULTA el resultado al cambiar las dimensiones de la matriz', async () => {
    montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);

    const [filas, columnas] = screen.getAllByRole('spinbutton');
    fireEvent.change(filas, { target: { value: '5' } });

    expect(hayResultado()).toBe(false);
    void columnas;
  });

  it('vuelve a mostrar un resultado nuevo tras recalcular', async () => {
    montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);

    runAssignment.mockResolvedValue({
      ...resultado,
      total_cost: 99,
    });

    calcular();

    expect(await screen.findByText('99')).toBeTruthy();
  });

  it('conserva la matriz, el resultado y el paso al volver de otra sección', async () => {
    const view = montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);
    fireEvent.click(screen.getByRole('button', { name: /ver proceso paso a paso/i }));
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));

    view.unmount();
    montar();

    expect(screen.getByText(/resultado de la misión/i)).toBeTruthy();
    expect(screen.getByText(/proceso del algoritmo/i)).toBeTruthy();
    expect(screen.getByText(/paso 2 de 2/i)).toBeTruthy();
  });

  it('el boton queda deshabilitado mientras corre el calculo', async () => {
    let resolver: (value: AssignmentResultData) => void = () => {};
    runAssignment.mockReturnValue(
      new Promise<AssignmentResultData>((resolve) => {
        resolver = resolve;
      })
    );

    montar();
    const boton = screen.getByRole('button', { name: /calcular asignación/i });

    fireEvent.click(boton);
    expect((boton as HTMLButtonElement).disabled).toBe(true);

    resolver(resultado);
    await screen.findByText(/resultado de la misión/i);
    expect((boton as HTMLButtonElement).disabled).toBe(false);
  });

  it('muestra un error legible si el backend falla', async () => {
    runAssignment.mockRejectedValue(
      new Error('sin conexion')
    );
    montar();

    calcular();

    expect(
      await screen.findByRole('alert')
    ).toBeTruthy();
  });

  it('muestra ausencia de solución sin pintar asignaciones ni costo total', async () => {
    runAssignment.mockResolvedValue({
      ...resultado,
      assignments: [],
      total_cost: 0,
    });
    montar();

    calcular();

    expect(
      await screen.findByText(/no existe una asignación factible para este grafo/i)
    ).toBeTruthy();
    expect(hayResultado()).toBe(false);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('mantiene las celdas prohibidas en la matriz de cada paso', async () => {
    useAssignmentStore.getState().setMatrix([
      [null, 4, 8],
      [4, null, 6],
      [7, 3, null],
    ]);
    runAssignment.mockResolvedValue({
      ...resultado,
      assignments: [
        { row: 'Trabajador 1', col: 'Tarea B', cost: 4 },
        { row: 'Trabajador 2', col: 'Tarea C', cost: 6 },
        { row: 'Trabajador 3', col: 'Tarea A', cost: 7 },
      ],
      initial_cost_matrix: [
        [100, 4, 8],
        [4, 100, 6],
        [7, 3, 100],
      ],
      steps: [
        {
          ...resultado.steps[0],
          matrix: [
            [0, 0, 4],
            [0, 1, 2],
            [4, 0, 3],
          ],
        },
      ],
    });

    montar();
    calcular();
    await screen.findByText(/resultado de la misión/i);
    fireEvent.click(screen.getByRole('button', { name: /ver proceso paso a paso/i }));

    expect(screen.getAllByText('Prohibida').length).toBeGreaterThan(0);
    expect(screen.queryByText('100')).toBeNull();
  });
});