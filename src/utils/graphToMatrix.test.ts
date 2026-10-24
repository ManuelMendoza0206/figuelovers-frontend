import { describe, expect, it } from 'vitest';

import type {
  GraphTransferEdge,
  GraphTransferNode,
} from './graphToMatrix';
import {
  MAX_GRAPH_NODES,
  serializeAssignmentMatrix,
  translateGraphToCostMatrix,
} from './graphToMatrix';

const node = (id: string, label?: string): GraphTransferNode =>
  label === undefined ? { id } : { id, label };

const edge = (
  source: string,
  target: string,
  weight: number,
  isDirected = true
): GraphTransferEdge => ({ source, target, weight, isDirected });

type Objective = 'minimize' | 'maximize';

const run = (
  nodes: GraphTransferNode[],
  edges: GraphTransferEdge[] = [],
  objective: Objective = 'minimize'
) => translateGraphToCostMatrix(nodes, edges, objective);

const ok = (
  nodes: GraphTransferNode[],
  edges: GraphTransferEdge[] = [],
  objective: Objective = 'minimize'
) => {
  const result = run(nodes, edges, objective);
  if (!result.ok) {
    throw new Error(`esperaba ok, bloqueo: ${result.blocked.reason}`);
  }
  return result.translation;
};

describe('translateGraphToCostMatrix - bloqueos', () => {
  it('rechaza menos de 2 nodos', () => {
    const result = run([node('A')]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.blocked.reason).toMatch(/2 nodos/);
  });

  it('rechaza mas de MAX_GRAPH_NODES nodos', () => {
    const nodes = Array.from(
      { length: MAX_GRAPH_NODES + 1 },
      (_, i) => node(`n${i}`)
    );
    const result = run(nodes, [edge('n0', 'n1', 1)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.blocked.reason).toMatch(/máximo es/);
  });

  it('rechaza un grafo sin conexiones', () => {
    const result = run([node('A'), node('B')]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.blocked.reason).toMatch(/no tiene conexiones/);
  });

  it('rechaza un grafo cuyas aristas apuntan a nodos inexistentes', () => {
    const result = run([node('A'), node('B')], [edge('A', 'FANTASMA', 3)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.blocked.reason).toMatch(/válidos/);
  });
});

describe('translateGraphToCostMatrix - construccion de la matriz', () => {
  it('usa el label del nodo y cae al id si esta vacio', () => {
    const t = ok(
      [node('A', 'Alpha'), node('B', '   '), node('C')],
      [edge('A', 'B', 5), edge('B', 'C', 7)]
    );
    expect(t.rowLabels).toEqual(['Alpha', 'B', 'C']);
    expect(t.colLabels).toEqual(['Alpha', 'B', 'C']);
  });

  it('las celdas SIN conexion quedan prohibidas y no confunden un costo 0 real', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);

    // [0][1] tiene arista; todo lo demas queda prohibido.
    expect(t.matrix[0][1]).toBe(5);
    expect(t.matrix[0][0]).toBeNull();
    expect(t.matrix[1][0]).toBeNull();
    expect(t.matrix[1][1]).toBeNull();
  });

  it('no deja ningun valor magico en la matriz', () => {
    // Una matriz traducida solo contiene costos reales o null.
    const t = ok(
      ['A', 'B', 'C'].map((id) => node(id)),
      [edge('A', 'B', 4), edge('B', 'C', 7), edge('C', 'A', 1)],
      'maximize'
    );

    const pesosReales = new Set([4, 7, 1]);
    for (const row of t.matrix) {
      for (const value of row) {
        expect(value === null || pesosReales.has(value)).toBe(true);
      }
    }
  });

  it('reporta exactamente cuales celdas quedaron vacias', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);

    expect(t.emptyCells).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
  });

  it('una arista dirigida puebla solo el sentido indicado', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);

    expect(t.matrix[0][1]).toBe(5);
    expect(t.emptyCells).toHaveLength(3);
  });

  it('mantiene la direccion del grafo de ejemplo a, b, c y d', () => {
    const t = ok(
      ['a', 'b', 'c', 'd'].map((id) => node(id)),
      [
        edge('b', 'a', 1),
        edge('b', 'd', 2),
        edge('c', 'a', 3),
        edge('d', 'c', 4),
      ]
    );

    expect(t.matrix).toEqual([
      [null, null, null, null],
      [1, null, null, 2],
      [3, null, null, null],
      [null, null, 4, null],
    ]);
  });

  it('una arista NO dirigida puebla ambos sentidos', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, false)]);

    expect(t.matrix[0][1]).toBe(5);
    expect(t.matrix[1][0]).toBe(5);
    expect(t.emptyCells).toEqual([[0, 0], [1, 1]]);
  });

  it('la diagonal queda prohibida salvo self-loop explicito', () => {
    const sinLoop = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);
    expect(sinLoop.matrix[0][0]).toBeNull();

    const conLoop = ok([node('A'), node('B')], [edge('A', 'A', 9, true)]);
    expect(conLoop.matrix[0][0]).toBe(9);
  });

  it('el self-loop no se duplica aunque sea no dirigida', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'A', 9, false)]);

    expect(t.matrix[0][0]).toBe(9);
    expect(t.emptyCells).toHaveLength(3);
  });

  it('ante aristas duplicadas gana la mas reciente', () => {
    const t = ok(
      [node('A'), node('B')],
      [edge('A', 'B', 1, true), edge('A', 'B', 42, true)]
    );

    expect(t.matrix[0][1]).toBe(42);
  });

  it('produce una matriz cuadrada NxN', () => {
    const nodes = ['A', 'B', 'C', 'D'].map((id) => node(id));
    const t = ok(nodes, [
      edge('A', 'B', 1),
      edge('B', 'C', 2),
      edge('C', 'D', 3),
    ]);

    expect(t.matrix).toHaveLength(4);
    for (const row of t.matrix) expect(row).toHaveLength(4);
  });

  it('tolera pesos ausentes o no numericos usando 1', () => {
    const t = ok(
      [node('A'), node('B')],
      [{ source: 'A', target: 'B' }, { source: 'B', target: 'A', weight: null }]
    );

    expect(t.matrix[0][1]).toBe(1);
    expect(t.matrix[1][0]).toBe(1);
  });

  it('el objetivo no altera la matriz inicial', () => {
    const nodes = ['A', 'B', 'C'].map((id) => node(id));
    const edges = [edge('A', 'B', 4), edge('B', 'C', 7)];

    expect(ok(nodes, edges, 'minimize').matrix).toEqual(
      ok(nodes, edges, 'maximize').matrix
    );
  });

  it('emptyCells + celdas con peso = todas las celdas', () => {
    const nodes = ['A', 'B', 'C', 'D'].map((id) => node(id));
    const t = ok(nodes, [
      edge('A', 'B', 1),
      edge('B', 'C', 2),
      edge('C', 'D', 3),
      edge('A', 'D', 4),
    ]);

    const conPeso = t.matrix.flat().filter((v) => v !== null).length;
    expect(conPeso + t.emptyCells.length).toBe(nodes.length ** 2);
  });
});

describe('serializeAssignmentMatrix - celdas prohibidas para el endpoint numerico', () => {
  /**
   * El endpoint conserva su contrato number[][]; la UI no expone esta
   * penalizacion, solo la usa para serializar null sin crear una arista.
   */
  it('serializa null como penalizacion sin alterar costos reales, incluido 0', () => {
    const t = ok(
      ['A', 'B', 'C'].map((id) => node(id)),
      [edge('A', 'B', 0), edge('B', 'C', 9)],
      'minimize'
    );
    const serialized = serializeAssignmentMatrix(t.matrix, false);
    expect(serialized[0][1]).toBe(0);
    expect(serialized[1][2]).toBe(9);
    expect(serialized[0][0]).toBeGreaterThan(9);
  });
});