import { describe, expect, it } from 'vitest';

import {
  serializeAssignmentMatrix,
  translateGraphToCostMatrix,
} from './graphToMatrix';

/**
 * Integracion contra el backend real. Es opt-in porque necesita un
 * servidor escuchando; `npm test` a secas no debe fallar por eso.
 *
 *   # terminal 1
 *   uvicorn app.main:app --port 8111
 *   # terminal 2
 *   RUN_INTEGRATION=1 npm test
 */
const API =
  process.env.INTEGRATION_API_URL ??
  'http://127.0.0.1:8111/api/v1/graph/algorithms/assignment';

const habilitado = process.env.RUN_INTEGRATION === '1';

const suite = habilitado ? describe : describe.skip;

const post = async (body: unknown) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as never };
};

interface RespuestaAssignment {
  assignments: { row: string; col: string; cost: number }[];
  total_cost: number;
  initial_cost_matrix: number[][];
  steps: {
    step: number;
    name: string;
    matrix: number[][];
    selected_zeros?: number[][] | null;
  }[];
  padding_info: unknown;
}

suite('integracion contra el backend real', () => {
  it('traduce la constelacion y el backend responde con el proceso', async () => {
    const nodes = ['A', 'B', 'C', 'D'].map((id) => ({ id, label: id }));
    const edges = [
      { source: 'A', target: 'B', weight: 4, isDirected: true },
      { source: 'A', target: 'C', weight: 9, isDirected: true },
      { source: 'B', target: 'C', weight: 2, isDirected: true },
      { source: 'B', target: 'D', weight: 7, isDirected: true },
      { source: 'C', target: 'A', weight: 5, isDirected: true },
      { source: 'C', target: 'D', weight: 1, isDirected: true },
      { source: 'D', target: 'A', weight: 3, isDirected: true },
      { source: 'D', target: 'B', weight: 8, isDirected: true },
    ];

    const r = translateGraphToCostMatrix(nodes, edges, 'minimize');
    if (!r.ok) throw new Error(r.blocked.reason);

    const { status, json } = await post({
      cost_matrix: serializeAssignmentMatrix(r.translation.matrix, false),
      row_labels: r.translation.rowLabels,
      col_labels: r.translation.colLabels,
      maximize: false,
    });

    expect(status).toBe(200);

    const res = json as RespuestaAssignment;
    expect(res.steps.length).toBeGreaterThan(0);
    expect(res.assignments.length).toBe(4);
    expect(res.initial_cost_matrix).toEqual(
      serializeAssignmentMatrix(r.translation.matrix, false)
    );

    // La asignacion optima debe caer sobre celdas que el usuario marco.
    const selected = res.steps
      .flatMap((s) => s.selected_zeros ?? [])
      .map(([rowIndex, colIndex]) => r.translation.matrix[rowIndex][colIndex]);

    expect(selected.length).toBeGreaterThan(0);
    for (const value of selected) {
      expect(typeof value).toBe('number');
    }
  });

  it('editar una celda cambia el resultado (el flujo real del usuario)', async () => {
    const nodes = ['A', 'B', 'C'].map((id) => ({ id, label: id }));
    const edges = [
      { source: 'A', target: 'B', weight: 4, isDirected: true },
      { source: 'B', target: 'C', weight: 4, isDirected: true },
      { source: 'C', target: 'A', weight: 4, isDirected: true },
    ];

    const r = translateGraphToCostMatrix(nodes, edges, 'minimize');
    if (!r.ok) throw new Error(r.blocked.reason);

    const matriz = r.translation.matrix;

    // Paso 1: las celdas vacias se serializan como prohibidas.
    const antes = (await post({
      cost_matrix: serializeAssignmentMatrix(matriz, false),
      row_labels: r.translation.rowLabels,
      col_labels: r.translation.colLabels,
      maximize: false,
    })).json as RespuestaAssignment;

    // Paso 2: el usuario edita y prohibe las celdas sin conexion.
    const editada = matriz.map((fila) =>
      fila.map((value) => (value === null ? 1000 : value))
    );
    for (const [rowIndex, colIndex] of r.translation.emptyCells) {
      editada[rowIndex][colIndex] = 1000;
    }

    const despues = (await post({
      cost_matrix: serializeAssignmentMatrix(editada, false),
      row_labels: r.translation.rowLabels,
      col_labels: r.translation.colLabels,
      maximize: false,
    })).json as RespuestaAssignment;

    // Con 0 en las vacias el optimo las exploitaba; al editarlas, no.
    expect(despues.total_cost).toBe(12);
    expect(antes.total_cost).toBe(0);

    for (const asignacion of despues.assignments) {
      const fila = r.translation.rowLabels.indexOf(asignacion.row);
      const columna = r.translation.rowLabels.indexOf(asignacion.col);
      expect(editada[fila][columna]).toBe(4);
    }
  });

  it('el backend rechaza una matriz de 21x21 con 422', async () => {
    const grande = Array.from({ length: 21 }, () =>
      Array.from({ length: 21 }, () => 1)
    );
    const { status } = await post({ cost_matrix: grande });
    expect(status).toBe(422);
  });
});