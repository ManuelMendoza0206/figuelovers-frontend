import { describe, expect, it } from 'vitest';
import type { AppEdge, AppNode } from '../types/graph';
import { treeFromGraph } from './treeFromGraph';

const nodes: AppNode[] = [1, 2, 3].map((value, index) => ({
  id: `n${value}`,
  position: { x: index * 100, y: value * 100 },
  data: { label: String(value), folio: value, treeValue: value },
}));

const directed = (source: string, target: string): AppEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  data: { weight: 1, is_directed: true },
});

describe('treeFromGraph', () => {
  it('converts a valid directed tree', () => {
    const result = treeFromGraph(nodes, [directed('n2', 'n1'), directed('n2', 'n3')]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root_id).toBe('n2');
  });

  it.each([
    { edges: [directed('n1', 'n2'), directed('n2', 'n1')], reason: /raíz|ciclo|conexo/i },
    { edges: [directed('n1', 'n3'), directed('n2', 'n3')], reason: /padre|raíz/i },
    { edges: [directed('n2', 'n1')], reason: /conexo|raíz/i },
    { edges: [{ ...directed('n2', 'n1'), data: { weight: 1, is_directed: false } }], reason: /dirigirse/i },
  ])('rejects invalid editor graph', ({ edges, reason }) => {
    const result = treeFromGraph(nodes, edges);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });
});
