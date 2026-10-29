import { describe, expect, it } from 'vitest';

import type { AppEdge, AppNode } from '../types/graph';
import {
  MAX_KRUSKAL_EDGES,
  MAX_KRUSKAL_NODES,
  buildKruskalPayload,
  resolveKruskalWeight,
  validateKruskalInput,
} from './kruskalInput';

const makeNode = (id: string): AppNode => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: id, folio: 1 },
});

const makeEdge = (
  id: string,
  source: string,
  target: string,
  weight: number | null,
  isDirected = false
): AppEdge => ({
  id,
  source,
  target,
  type: 'straight',
  data: { weight: weight as number, is_directed: isDirected },
});

describe('resolveKruskalWeight', () => {
  it('treats a missing weight as 1 and keeps negatives and zeros', () => {
    expect(resolveKruskalWeight(null)).toBe(1);
    expect(resolveKruskalWeight(undefined)).toBe(1);
    expect(resolveKruskalWeight(0)).toBe(0);
    expect(resolveKruskalWeight(-4)).toBe(-4);
  });
});

describe('buildKruskalPayload', () => {
  it('maps the store graph and the chosen objective', () => {
    const payload = buildKruskalPayload(
      [makeNode('A'), makeNode('B')],
      [makeEdge('e1', 'A', 'B', 2)],
      'max'
    );

    expect(payload.objective).toBe('max');
    expect(payload.graph.edges[0]).toMatchObject({
      id: 'e1',
      weight: 2,
      is_directed: false,
    });
  });
});

describe('validateKruskalInput', () => {
  it('accepts a normal graph, including undirected negatives (Kruskal allows them)', () => {
    const check = validateKruskalInput(
      [makeNode('A'), makeNode('B')],
      [makeEdge('e1', 'A', 'B', -3)]
    );
    expect(check.errors).toEqual([]);
    expect(check.unusualWeightEdgeIds).toEqual(['e1']);
    expect(check.hasDirectedEdges).toBe(false);
  });

  it('rejects an empty graph', () => {
    const check = validateKruskalInput([], []);
    expect(check.errors[0]).toMatch(/Añade nodos/);
  });

  it('rejects graphs over the node and edge limits', () => {
    const manyNodes = Array.from({ length: MAX_KRUSKAL_NODES + 1 }, (_, index) =>
      makeNode(`n${index}`)
    );
    expect(validateKruskalInput(manyNodes, []).errors[0]).toContain(
      String(MAX_KRUSKAL_NODES)
    );

    const manyEdges = Array.from({ length: MAX_KRUSKAL_EDGES + 1 }, (_, index) =>
      makeEdge(`e${index}`, 'A', 'B', 1)
    );
    const check = validateKruskalInput([makeNode('A'), makeNode('B')], manyEdges);
    expect(check.errors[0]).toContain(String(MAX_KRUSKAL_EDGES));
  });

  it('flags directed edges because Kruskal will ignore their direction', () => {
    const check = validateKruskalInput(
      [makeNode('A'), makeNode('B')],
      [makeEdge('e1', 'A', 'B', 1, true)]
    );
    expect(check.hasDirectedEdges).toBe(true);
    expect(check.errors).toEqual([]);
  });
});
