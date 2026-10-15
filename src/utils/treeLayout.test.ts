import { describe, expect, it } from 'vitest';
import type { TreeData } from '../types/graph';
import { layoutTree } from './treeLayout';

const sample: TreeData = {
  root_id: 'r',
  nodes: [
    { id: 'r', value: 4, left: 'l', right: 'x' },
    { id: 'l', value: 2, left: 'a', right: 'b' },
    { id: 'a', value: 1, left: null, right: null },
    { id: 'b', value: 3, left: null, right: null },
    { id: 'x', value: 6, left: null, right: 'z' },
    { id: 'z', value: 7, left: null, right: null },
  ],
  edges: [
    { source: 'r', target: 'l' }, { source: 'r', target: 'x' },
    { source: 'l', target: 'a' }, { source: 'l', target: 'b' },
    { source: 'x', target: 'z' },
  ],
};

describe('layoutTree', () => {
  it('places every node at a unique position and centers a parent over its children', () => {
    const { nodes } = layoutTree(sample);
    const positions = nodes.map((node) => `${node.position.x},${node.position.y}`);
    expect(new Set(positions).size).toBe(nodes.length);
    const position = new Map(nodes.map((node) => [node.id, node.position]));
    expect(position.get('r')?.x).toBe((position.get('l')!.x + position.get('x')!.x) / 2);
    expect(position.get('l')?.x).toBe((position.get('a')!.x + position.get('b')!.x) / 2);
    const byLevel = new Map<number, number[]>();
    for (const node of nodes) {
      const level = node.position.y;
      byLevel.set(level, [...(byLevel.get(level) ?? []), node.position.x]);
    }
    for (const levelXs of byLevel.values()) {
      expect(new Set(levelXs).size).toBe(levelXs.length);
    }
  });

  it('keeps asymmetric one-child branches separated while centering two-child parents', () => {
    const skewed: TreeData = {
      root_id: 'root',
      nodes: [
        { id: 'root', value: 8, left: 'left', right: 'right' },
        { id: 'left', value: 4, left: 'left2', right: null },
        { id: 'left2', value: 2, left: 'left3', right: null },
        { id: 'left3', value: 1, left: null, right: null },
        { id: 'right', value: 12, left: null, right: 'right2' },
        { id: 'right2', value: 14, left: null, right: 'right3' },
        { id: 'right3', value: 15, left: null, right: null },
      ],
      edges: [
        { source: 'root', target: 'left' }, { source: 'root', target: 'right' },
        { source: 'left', target: 'left2' }, { source: 'left2', target: 'left3' },
        { source: 'right', target: 'right2' }, { source: 'right2', target: 'right3' },
      ],
    };
    const { nodes } = layoutTree(skewed);
    const position = new Map(nodes.map((node) => [node.id, node.position]));
    expect(position.get('root')?.x).toBe((position.get('left')!.x + position.get('right')!.x) / 2);
    const byLevel = new Map<number, number[]>();
    for (const node of nodes) byLevel.set(node.position.y, [...(byLevel.get(node.position.y) ?? []), node.position.x]);
    for (const levelXs of byLevel.values()) expect(new Set(levelXs).size).toBe(levelXs.length);
  });
});
