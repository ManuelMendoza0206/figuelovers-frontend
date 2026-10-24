import { describe, expect, it } from 'vitest';

import type { AppEdge, AppNode } from '../types/graph';
import {
  MAX_DIJKSTRA_NODES,
  buildDijkstraPayload,
  resolveEdgeWeight,
  validateDijkstraInput,
} from './dijkstraInput';

const makeNode = (id: string, label?: string): AppNode => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: label ?? id, folio: 1 },
});

const makeEdge = (
  id: string,
  source: string,
  target: string,
  weight: number | null,
  isDirected = true
): AppEdge => ({
  id,
  source,
  target,
  type: 'straight',
  data: { weight: weight as number, is_directed: isDirected },
});

describe('resolveEdgeWeight', () => {
  it('treats a missing weight as 1, like the backend schema', () => {
    expect(resolveEdgeWeight(null)).toBe(1);
    expect(resolveEdgeWeight(undefined)).toBe(1);
    expect(resolveEdgeWeight(0)).toBe(0);
    expect(resolveEdgeWeight(-3)).toBe(-3);
  });
});

describe('buildDijkstraPayload', () => {
  it('maps the store graph to the endpoint payload and defaults target to null', () => {
    const nodes = [makeNode('A', 'Alfa'), makeNode('B')];
    const edges = [makeEdge('e1', 'A', 'B', 4)];

    const payload = buildDijkstraPayload(nodes, edges, 'A');

    expect(payload.source).toBe('A');
    expect(payload.target).toBeNull();
    expect(payload.graph.nodes.map((node) => node.id)).toEqual(['A', 'B']);
    expect(payload.graph.edges[0]).toMatchObject({
      id: 'e1',
      source: 'A',
      target: 'B',
      weight: 4,
      is_directed: true,
    });
  });

  it('keeps an explicit target', () => {
    const payload = buildDijkstraPayload([makeNode('A')], [], 'A', 'A');
    expect(payload.target).toBe('A');
  });
});

describe('validateDijkstraInput', () => {
  it('accepts a graph with non-negative weights', () => {
    const check = validateDijkstraInput(
      [makeNode('A'), makeNode('B')],
      [makeEdge('e1', 'A', 'B', 0)],
      'A'
    );
    expect(check.errors).toEqual([]);
    expect(check.negativeEdges).toEqual([]);
  });

  it('rejects an empty graph and a missing origin', () => {
    const empty = validateDijkstraInput([], [], '');
    expect(empty.errors[0]).toMatch(/Añade nodos/);

    const noOrigin = validateDijkstraInput([makeNode('A')], [], '');
    expect(noOrigin.errors[0]).toMatch(/origen/i);
  });

  it('rejects graphs over the node limit', () => {
    const nodes = Array.from({ length: MAX_DIJKSTRA_NODES + 1 }, (_, index) =>
      makeNode(`n${index}`)
    );
    const check = validateDijkstraInput(nodes, [], 'n0');
    expect(check.errors[0]).toContain(String(MAX_DIJKSTRA_NODES));
  });

  it('lists negative edges with visible labels and points to Johnson', () => {
    const check = validateDijkstraInput(
      [makeNode('A', 'Alfa'), makeNode('B', 'Beta'), makeNode('C')],
      [makeEdge('e1', 'A', 'B', -2), makeEdge('e2', 'B', 'C', 3, false)],
      'A'
    );

    expect(check.negativeEdges).toHaveLength(1);
    expect(check.negativeEdges[0]).toMatchObject({
      id: 'e1',
      fromLabel: 'Alfa',
      toLabel: 'Beta',
      weight: -2,
    });
    expect(check.errors[0]).toContain('Alfa → Beta (-2)');
    expect(check.errors[0]).toMatch(/Johnson/);
  });

  it('treats a null weight as 1 and does not flag it', () => {
    const check = validateDijkstraInput(
      [makeNode('A'), makeNode('B')],
      [makeEdge('e1', 'A', 'B', null)],
      'A'
    );
    expect(check.negativeEdges).toEqual([]);
    expect(check.errors).toEqual([]);
  });
});
