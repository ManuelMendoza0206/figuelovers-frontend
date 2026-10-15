import type { AppEdge, AppNode, TreeData } from '../types/graph';
import { createEdgeMarker, createEdgeStyle } from '../lib/graphEdge';

export interface TreeLayout {
  nodes: AppNode[];
  edges: AppEdge[];
  width: number;
  height: number;
}

const NODE_GAP = 110;
const NODE_MARGIN = 70;

export const layoutTree = (tree: TreeData): TreeLayout => {
  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  interface Placement {
    x: number;
    y: number;
    side?: 'left' | 'right';
  }
  interface Subtree {
    rootX: number;
    width: number;
    placements: Map<string, Placement>;
  }

  const visit = (nodeId: string | null, depth: number, side?: 'left' | 'right'): Subtree | null => {
    if (nodeId === null) return null;
    const node = byId.get(nodeId);
    if (!node) return null;
    const left = visit(node.left, depth + 1, 'left');
    const right = visit(node.right, depth + 1, 'right');
    if (left && right) {
      const rightOffset = left.width + NODE_GAP;
      const rootX = (left.rootX + rightOffset + right.rootX) / 2;
      const placements = new Map(left.placements);
      for (const [id, placement] of right.placements) {
        placements.set(id, { ...placement, x: placement.x + rightOffset });
      }
      placements.set(node.id, { x: rootX, y: depth * 120, side });
      return { rootX, width: rightOffset + right.width, placements };
    }

    const child = left ?? right;
    if (!child) {
      const rootX = NODE_GAP / 2;
      return {
        rootX,
        width: NODE_GAP,
        placements: new Map([[node.id, { x: rootX, y: depth * 120, side }]]),
      };
    }

    const rootX = left ? child.rootX + NODE_GAP : child.rootX - NODE_GAP;
    const minX = Math.min(0, rootX - NODE_GAP / 2);
    const maxX = Math.max(child.width, rootX + NODE_GAP / 2);
    const offset = -minX;
    const placements = new Map<string, Placement>();
    for (const [id, placement] of child.placements) {
      placements.set(id, { ...placement, x: placement.x + offset });
    }
    placements.set(node.id, { x: rootX + offset, y: depth * 120, side });
    return { rootX: rootX + offset, width: maxX - minX, placements };
  };

  const subtree = visit(tree.root_id, 0);
  const positions = subtree?.placements ?? new Map<string, Placement>();
  const maxDepth = Math.max(0, ...[...positions.values()].map(({ y }) => y / 120));

  const nodes = tree.nodes.map((node, index) => {
    const position = positions.get(node.id) ?? { x: NODE_MARGIN + index * NODE_GAP, y: 0 };
    return {
      id: node.id,
      position: { x: position.x + NODE_MARGIN, y: position.y + 60 },
      data: {
        label: String(node.value),
        folio: index + 1,
        treeValue: node.value,
        ...(position.side ? { treeSide: position.side } : {}),
      },
    };
  });
  const edges: AppEdge[] = tree.edges.map((edge, index) => ({
    id: `tree-edge-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'straight',
    label: '',
    data: { weight: 1, is_directed: true },
    markerEnd: createEdgeMarker(),
    style: createEdgeStyle(),
  }));

  return {
    nodes,
    edges,
    width: Math.max(400, (subtree?.width ?? 0) + NODE_MARGIN * 2),
    height: Math.max(180, 120 + maxDepth * 120),
  };
};
