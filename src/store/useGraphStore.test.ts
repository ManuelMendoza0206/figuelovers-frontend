import { beforeEach, describe, expect, it } from 'vitest';

import type { Connection } from 'reactflow';

import type { AppEdge, AppNode } from '../types/graph';
import { useGraphStore } from './useGraphStore';

/**
 * Tests del store del lienzo.
 *
 * Acá vive el comportamiento que el usuario nota: que al borrar un nodo
 * no queden aristas colgando, que los folios no se repitan, que no se
 * puedan crear dos aristas iguales. Son invariantes, no detalhes de
 * implementacion, asi que si el store se reescribe siguen sirviendo.
 */

const store = () => useGraphStore.getState();

const reset = (): void => {
  store().clearGraph();
};

const makeNodes = (count: number): AppNode[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    position: { x: i * 100, y: 0 },
    data: { label: `Nodo ${i}`, folio: i + 1 },
  })) as AppNode[];

const makeEdge = (
  id: string,
  source: string,
  target: string,
  isDirected = true,
  weight = 1
): AppEdge =>
  ({
    id,
    source,
    target,
    data: { weight, is_directed: isDirected },
  }) as AppEdge;

const seed = (
  nodes: AppNode[],
  edges: AppEdge[]
): void => {
  store().loadGraph(nodes, edges);
};

/** reactflow exige los handles en el tipo Connection. */
const connect = (
  source: string | null | undefined,
  target: string | null | undefined
): Connection => ({
  source: source ?? null,
  target: target ?? null,
  sourceHandle: null,
  targetHandle: null,
});

/** Lectura segura de la primera arista, para no pelear con `strict`. */
const firstEdge = (): AppEdge => {
  const edge = store().edges[0];
  if (!edge) throw new Error('no hay aristas');
  return edge;
};

const firstNode = (): AppNode => {
  const node = store().nodes[0];
  if (!node) throw new Error('no hay nodos');
  return node;
};

beforeEach(reset);

describe('loadGraph / folios', () => {
  it('asigna folios correlativos cuando el origen no trae', () => {
    const nodes = makeNodes(3).map((node) => {
      const clone = { ...node, data: {} } as unknown as AppNode;
      return clone;
    });

    seed(nodes, []);

    expect(store().nodes.map((n) => n.data.folio)).toEqual([1, 2, 3]);
    expect(store().nextFolio).toBe(4);
  });

  it('respeta los folios que ya vienen', () => {
    seed(makeNodes(3), []);

    expect(store().nodes.map((n) => n.data.folio)).toEqual([1, 2, 3]);
    expect(store().nextFolio).toBe(4);
  });

  it('no pisa folios existentes y completa solo los huecos', () => {
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A', folio: 7 } },
      { id: 'b', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'c', position: { x: 0, y: 0 }, data: { label: 'C', folio: 2 } },
    ] as AppNode[];

    seed(nodes, []);

    const folios = store().nodes.map((n) => n.data.folio);
    expect(folios).toContain(7);
    expect(folios).toContain(2);
    // El hueco se completo desde el siguiente libre al maximo (8).
    expect(folios).toContain(8);
    expect(new Set(folios).size).toBe(3);
  });

  it('el siguiente folio no colisiona con ninguno existente', () => {
    seed(makeNodes(3), []);

    const next = store().nextFolio;
    const folios = store().nodes.map((n) => n.data.folio);

    expect(folios).not.toContain(next);
  });

  it('ignora un folio no numerico y lo reemplaza', () => {
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A', folio: 'nope' } },
    ] as unknown as AppNode[];

    seed(nodes, []);

    expect(typeof firstNode().data.folio).toBe('number');
  });

  it('limpia la seleccion al cargar', () => {
    seed(makeNodes(2), []);
    store().setSelectedElement(firstNode(), null);

    seed(makeNodes(2), []);

    expect(store().selectedNode).toBeNull();
    expect(store().selectedEdge).toBeNull();
  });
});

describe('addNode', () => {
  it('incrementa el folio y selecciona el nodo nuevo', () => {
    store().addNode({ x: 10, y: 20 });
    const first = firstNode();

    expect(first.data.folio).toBe(1);
    expect(store().nextFolio).toBe(2);
    expect(store().selectedNode?.id).toBe(first.id);

    store().addNode({ x: 30, y: 40 });

    expect(store().nodes[1].data.folio).toBe(2);
    expect(store().nextFolio).toBe(3);
  });

  it('deselecciona la arista al agregar un nodo', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);
    store().setSelectedElement(null, firstEdge());

    store().addNode({ x: 0, y: 0 });

    expect(store().selectedEdge).toBeNull();
  });
});

describe('deleteNode — no debe dejar aristas huerfanas', () => {
  it('borra las aristas incidentes en ambas direcciones', () => {
    seed(makeNodes(3), [
      makeEdge('a', 'n0', 'n1'),
      makeEdge('b', 'n1', 'n2'),
      makeEdge('c', 'n2', 'n0'),
    ]);

    store().deleteNode('n0');

    expect(store().nodes).toHaveLength(2);
    expect(store().edges).toHaveLength(1);
    expect(firstEdge().id).toBe('b');
  });

  it('deja intactas las aristas que no lo tocan', () => {
    seed(makeNodes(4), [
      makeEdge('lejana', 'n2', 'n3'),
      makeEdge('cercana', 'n0', 'n1'),
    ]);

    store().deleteNode('n0');

    expect(store().edges.map((e) => e.id)).toEqual(['lejana']);
  });

  it('deselecciona el nodo borrado', () => {
    seed(makeNodes(2), []);
    store().setSelectedElement(firstNode(), null);

    store().deleteNode(firstNode().id);

    expect(store().selectedNode).toBeNull();
  });

  it('deselecciona una arista que quedaba huerfana', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);
    store().setSelectedElement(null, firstEdge());

    store().deleteNode('n1');

    expect(store().selectedEdge).toBeNull();
  });

  it('es idempotente con un id inexistente', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().deleteNode('NO_EXISTE');

    expect(store().nodes).toHaveLength(2);
    expect(store().edges).toHaveLength(1);
  });

  it('deja el grafo coherente tras borrar el ultimo nodo', () => {
    seed(makeNodes(1), []);
    store().deleteNode('n0');

    expect(store().nodes).toHaveLength(0);
    expect(store().edges).toHaveLength(0);
  });
});

describe('deleteEdge', () => {
  it('borra solo la arista indicada', () => {
    seed(makeNodes(3), [
      makeEdge('a', 'n0', 'n1'),
      makeEdge('b', 'n1', 'n2'),
    ]);

    store().deleteEdge('a');

    expect(store().edges.map((e) => e.id)).toEqual(['b']);
  });

  it('deselecciona la arista borrada', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);
    store().setSelectedElement(null, firstEdge());

    store().deleteEdge('e1');

    expect(store().selectedEdge).toBeNull();
  });

  it('es idempotente con un id inexistente', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().deleteEdge('NOPE');

    expect(store().edges).toHaveLength(1);
  });
});

describe('onConnect — duplicados', () => {
  beforeEach(() => {
    seed(makeNodes(3), []);
  });

  it('crea la arista y la selecciona', () => {
    store().onConnect(connect('n0', 'n1'));

    expect(store().edges).toHaveLength(1);
    expect(firstEdge().data?.is_directed).toBe(true);
    expect(store().selectedEdge?.id).toBe(firstEdge().id);
    expect(store().selectedNode).toBeNull();
  });

  it('rechaza el par exacto repetido', () => {
    store().onConnect(connect('n0', 'n1'));
    store().onConnect(connect('n0', 'n1'));

    expect(store().edges).toHaveLength(1);
  });

  it('permite el par inverso si ambas son dirigidas', () => {
    store().onConnect(connect('n0', 'n1'));
    store().onConnect(connect('n1', 'n0'));

    expect(store().edges).toHaveLength(2);
  });

  it('rechaza el par inverso si la existente es NO dirigida', () => {
    store().onConnect(connect('n0', 'n1'));
    const edges = store().edges;
    const base = edges[0];
    if (!base) throw new Error('no hay aristas');
    useGraphStore.setState({
      edges: [
        {
          ...base,
          data: {
            weight: base.data?.weight ?? 1,
            is_directed: false,
          },
        },
      ],
    });

    store().onConnect(connect('n1', 'n0'));

    expect(store().edges).toHaveLength(1);
  });

  it('ignora una conexion sin source o sin target', () => {
    store().onConnect(connect(null, 'n1'));
    store().onConnect(connect('n0', null));
    store().onConnect(connect('n0', undefined));

    expect(store().edges).toHaveLength(0);
  });

  it('permite un self-loop', () => {
    store().onConnect(connect('n0', 'n0'));

    expect(store().edges).toHaveLength(1);
  });

  it('no toca el folio al crear aristas', () => {
    const antes = store().nextFolio;

    store().onConnect(connect('n0', 'n1'));

    expect(store().nextFolio).toBe(antes);
  });
});

describe('reverseEdge', () => {
  it('invierte source y target', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().reverseEdge('e1');

    expect(firstEdge().source).toBe('n1');
    expect(firstEdge().target).toBe('n0');
  });

  it('intercambia los handles de reactflow', () => {
    const edge = {
      ...makeEdge('e1', 'n0', 'n1'),
      sourceHandle: 'source-3',
      targetHandle: 'target-7',
    } as AppEdge;
    seed(makeNodes(2), [edge]);

    store().reverseEdge('e1');

    expect(firstEdge().sourceHandle).toBe('source-7');
    expect(firstEdge().targetHandle).toBe('target-3');
  });

  it('conserva el peso', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1', true, 42)]);

    store().reverseEdge('e1');

    expect(firstEdge().data?.weight).toBe(42);
  });

  it('no hace nada sobre una arista no dirigida', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1', false)]);

    store().reverseEdge('e1');

    expect(firstEdge().source).toBe('n0');
    expect(firstEdge().data?.is_directed).toBe(false);
  });

  it('rechaza invertir si ya existe la opuesta', () => {
    seed(makeNodes(2), [
      makeEdge('e1', 'n0', 'n1'),
      makeEdge('e2', 'n1', 'n0'),
    ]);

    store().reverseEdge('e1');

    const sources = store().edges.map((e) => `${e.source}->${e.target}`);
    expect(sources).toContain('n0->n1');
    expect(sources).toContain('n1->n0');
  });

  it('es idempotente con un id inexistente', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().reverseEdge('NOPE');

    expect(store().edges).toHaveLength(1);
  });
});

describe('updateNodeData / updateEdgeData', () => {
  it('actualiza el label y re-resuelve la seleccion', () => {
    seed(makeNodes(2), []);
    const id = firstNode().id;
    store().setSelectedElement(firstNode(), null);

    store().updateNodeData(id, 'Renombrado');

    expect(firstNode().data.label).toBe('Renombrado');
    expect(store().selectedNode?.data.label).toBe('Renombrado');
  });

  it('updateEdgeData sincroniza el label visible con el peso', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().updateEdgeData('e1', 99, true);

    expect(firstEdge().data?.weight).toBe(99);
    expect(firstEdge().label).toBe('99');
  });

  it('al pasar a no dirigida quita el marker', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1')]);

    store().updateEdgeData('e1', 5, false);

    expect(firstEdge().markerEnd).toBeUndefined();
    expect(firstEdge().data?.is_directed).toBe(false);
  });

  it('al pasar a dirigida vuelve a poner el marker', () => {
    seed(makeNodes(2), [makeEdge('e1', 'n0', 'n1', false)]);

    store().updateEdgeData('e1', 5, true);

    expect(firstEdge().markerEnd).toBeDefined();
  });
});

describe('validationData', () => {
  it('se invalida al modificar el grafo', () => {
    seed(makeNodes(2), []);
    store().setValidationData({
      estadisticas: { total_nodos: 2, total_aristas: 0, es_dirigido: false },
      matriz_adyacencia: { nodes: [], matrix: [], is_directed: false },
      lista_adyacencia: {},
    });

    store().addNode({ x: 0, y: 0 });

    expect(store().validationData).toBeNull();
  });

  it('sobrevive a operaciones que no cambian el grafo', () => {
    seed(makeNodes(2), []);
    const data = {
      estadisticas: { total_nodos: 2, total_aristas: 0, es_dirigido: false },
      matriz_adyacencia: { nodes: [], matrix: [], is_directed: false },
      lista_adyacencia: {},
    };
    store().setValidationData(data);

    store().setSelectedElement(firstNode(), null);

    expect(store().validationData).not.toBeNull();
  });
});

describe('clearGraph', () => {
  it('deja el store en el estado inicial', () => {
    seed(makeNodes(3), [makeEdge('e1', 'n0', 'n1')]);
    store().addNode({ x: 0, y: 0 });

    store().clearGraph();

    expect(store().nodes).toEqual([]);
    expect(store().edges).toEqual([]);
    expect(store().nextFolio).toBe(1);
    expect(store().selectedNode).toBeNull();
    expect(store().selectedEdge).toBeNull();
    expect(store().validationData).toBeNull();
  });
});