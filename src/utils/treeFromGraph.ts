import type { AppEdge, AppNode, TreeData, TreeNodeData } from '../types/graph';

export type TreeFromGraphResult =
  | { ok: true; tree: TreeData }
  | { ok: false; reason: string };

export const treeFromGraph = (nodes: AppNode[], edges: AppEdge[]): TreeFromGraphResult => {
  if (nodes.length === 0) return { ok: false, reason: 'El grafo no contiene nodos.' };
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) return { ok: false, reason: 'Hay identificadores de nodo repetidos.' };
  const children = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const parents = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (!edge.data?.is_directed) return { ok: false, reason: 'Todas las aristas deben dirigirse de padre a hijo.' };
    if (!byId.has(edge.source) || !byId.has(edge.target)) return { ok: false, reason: `La arista ${edge.id} referencia un nodo inexistente.` };
    const next = children.get(edge.source);
    if (!next) return { ok: false, reason: `No existe el nodo padre ${edge.source}.` };
    next.push(edge.target);
    if (next.length > 2) return { ok: false, reason: `El nodo ${edge.source} tiene más de dos hijos.` };
    const count = (parents.get(edge.target) ?? 0) + 1;
    parents.set(edge.target, count);
    if (count > 1) return { ok: false, reason: `El nodo ${edge.target} tiene más de un padre.` };
  }

  const roots = nodes.filter((node) => parents.get(node.id) === 0);
  if (roots.length !== 1) return { ok: false, reason: 'El grafo debe tener exactamente una raíz.' };
  if (edges.length !== nodes.length - 1) return { ok: false, reason: 'El grafo debe ser conexo y no contener ciclos.' };

  const childrenByParent = new Map<string, { left: string | null; right: string | null }>();
  for (const node of nodes) {
    const childIds = children.get(node.id) ?? [];
    if (childIds.length === 2) {
      const sides = childIds.map((id) => byId.get(id)?.data?.treeSide);
      let left: string;
      let right: string;
      if (new Set(sides).size === 2 && sides.includes('left') && sides.includes('right')) {
        left = childIds[sides.indexOf('left')];
        right = childIds[sides.indexOf('right')];
      } else {
        const first = byId.get(childIds[0]);
        const second = byId.get(childIds[1]);
        if (!first || !second) return { ok: false, reason: `No se pudieron resolver los hijos de ${node.id}.` };
        [left, right] = first.position.x <= second.position.x
          ? [first.id, second.id]
          : [second.id, first.id];
      }
      childrenByParent.set(node.id, { left, right });
    } else if (childIds.length === 1) {
      const childId = childIds[0];
      const child = byId.get(childId);
      const side = child?.data?.treeSide ?? (child && child.position.x < node.position.x ? 'left' : 'right');
      childrenByParent.set(node.id, { left: side === 'left' ? childId : null, right: side === 'right' ? childId : null });
    } else {
      childrenByParent.set(node.id, { left: null, right: null });
    }
  }

  const visited = new Set<string>();
  const stack = [roots[0].id];
  while (stack.length) {
    const id = stack.pop();
    if (!id) continue;
    if (visited.has(id)) return { ok: false, reason: 'El grafo contiene un ciclo.' };
    visited.add(id);
    const pair = childrenByParent.get(id);
    if (pair?.right) stack.push(pair.right);
    if (pair?.left) stack.push(pair.left);
  }
  if (visited.size !== nodes.length) return { ok: false, reason: 'El grafo debe ser conexo.' };

  const values = new Set<number>();
  const treeNodes: TreeNodeData[] = [];
  for (const node of nodes) {
    const raw = node.data?.treeValue ?? Number(node.data?.label);
    if (!Number.isInteger(raw)) return { ok: false, reason: `El nodo ${node.id} debe tener un valor entero.` };
    if (values.has(raw)) return { ok: false, reason: 'Los valores del árbol deben ser únicos.' };
    values.add(raw);
    const pair = childrenByParent.get(node.id) ?? { left: null, right: null };
    treeNodes.push({ id: node.id, value: raw, left: pair.left, right: pair.right });
  }
  return {
    ok: true,
    tree: {
      root_id: roots[0].id,
      nodes: treeNodes,
      edges: edges.map((edge) => ({ source: edge.source, target: edge.target })),
    },
  };
};
