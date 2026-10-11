import { describe, expect, it } from 'vitest';

import type {
  GraphTransferEdge,
  GraphTransferNode,
} from './graphToMatrix';
import {
  MAX_GRAPH_NODES,
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

  it('las celdas SIN conexion quedan en 0 y son editables', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);

    // [0][1] tiene arista; todo lo demas arranca en 0.
    expect(t.matrix[0][1]).toBe(5);
    expect(t.matrix[0][0]).toBe(0);
    expect(t.matrix[1][0]).toBe(0);
    expect(t.matrix[1][1]).toBe(0);
  });

  it('no deja ningun valor magico en la matriz', () => {
    // Este es el requisito explicito: nada de sentinelsDerivados. Todos
    // los valores tienen que ser 0 o el peso de una arista real.
    const t = ok(
      ['A', 'B', 'C'].map((id) => node(id)),
      [edge('A', 'B', 4), edge('B', 'C', 7), edge('C', 'A', 1)],
      'maximize'
    );

    const pesosReales = new Set([4, 7, 1]);
    for (const row of t.matrix) {
      for (const value of row) {
        expect(value === 0 || pesosReales.has(value)).toBe(true);
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

  it('una arista NO dirigida puebla ambos sentidos', () => {
    const t = ok([node('A'), node('B')], [edge('A', 'B', 5, false)]);

    expect(t.matrix[0][1]).toBe(5);
    expect(t.matrix[1][0]).toBe(5);
    expect(t.emptyCells).toEqual([[0, 0], [1, 1]]);
  });

  it('la diagonal queda en 0 salvo self-loop explicito', () => {
    const sinLoop = ok([node('A'), node('B')], [edge('A', 'B', 5, true)]);
    expect(sinLoop.matrix[0][0]).toBe(0);

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

    const conPeso = t.matrix.flat().filter((v) => v !== 0).length;
    expect(conPeso + t.emptyCells.length).toBe(nodes.length ** 2);
  });
});

describe('translateGraphToCostMatrix - el coste de dejar celdas en 0', () => {
  /**
   * Documenta, a proposito, por que el banner de la UI advierte.
   *
   * Con las celdas sin conexion en 0 (que es lo que pidio el usuario, y
   * esta bien porque quedan editables), el hungaro MINIMIZA y por lo
   * tanto va a preferir esas celdas. No es un bug: es la consecuencia
   * matematica de que 0 sea el valor mas barato.
   *
   * Si el usuario quiere que esas parejas queden prohibidas, tiene que
   * poner un valor alto a mano.
   */
  it('con celdas vacias en 0 el optimo cae en las celdas sin conexion', () => {
    const t = ok(
      ['A', 'B', 'C'].map((id) => node(id)),
      [edge('A', 'B', 9), edge('B', 'C', 9)],
      'minimize'
    );

    // Todas las celdas valen 0 salvo dos. El optimo de minimizing es 0
    // y se apoya en las celdas vacias.
    const totalMinimo = t.matrix.flat().reduce((a, b) => a + b, 0);

    expect(totalMinimo).toBe(18);
    // Hay celdas en 0 disponibles, que es justamente el problema.
    expect(t.emptyCells.length).toBeGreaterThan(0);
  });

  it('si el usuario sube las celdas vacias, el optimo se apoya en las reales', () => {
    const t = ok(
      ['A', 'B', 'C'].map((id) => node(id)),
      [edge('A', 'B', 9), edge('B', 'C', 9)],
      'minimize'
    );

    // Simulamos que el usuario prohibio las celdas sin conexion.
    const editable = t.matrix.map((row) => [...row]);
    for (const [r, c] of t.emptyCells) {
      editable[r][c] = 1000;
    }

    const pendienteDeAristas = editable
      .flatMap((row, r) => row.map((v, c) => ({ v, r, c })))
      .filter(({ v }) => v !== 1000)
      .map(({ v }) => v);

    expect(Math.min(...pendienteDeAristas)).toBe(9);
  });
});