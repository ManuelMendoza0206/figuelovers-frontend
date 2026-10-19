import { beforeEach, describe, expect, it } from 'vitest';

import type { Connection, EdgeChange, NodeChange } from 'reactflow';

import type { AppEdge, AppNode } from '../types/graph';
import { useGraphStore } from './useGraphStore';

/**
 * Bloqueo estructural de las constelaciones.
 *
 * La regla que se prueba acá es fuerte: el bloqueo vive en el STORE, no
 * en los botones. Si alguien llama a addNode por teclado, por un evento,
 * o desde cualquier pantalla, la forma de la constelación no se mueve.
 *
 * El otro lado del contrato también se prueba: renombrar estrellas,
 * cambiar pesos, dirección y data de nodos SIGUE permitido, porque eso
 * es lo que hace útil una constelación.
 */

const store = () => useGraphStore.getState();

const makeNodes = (): AppNode[] =>
  [
    { id: 'betelgeuse', position: { x: 180, y: 80 }, data: { label: 'Betelgeuse' } },
    { id: 'bellatrix', position: { x: 420, y: 80 }, data: { label: 'Bellatrix' } },
    { id: 'alnitak', position: { x: 235, y: 260 }, data: { label: 'Alnitak' } },
  ] as AppNode[];

const makeEdges = (): AppEdge[] =>
  [
    {
      id: 'orion-betelgeuse-alnitak',
      source: 'betelgeuse',
      target: 'alnitak',
      label: '1',
      data: { weight: 1, is_directed: true },
    },
    {
      id: 'orion-bellatrix-alnitak',
      source: 'bellatrix',
      target: 'alnitak',
      label: '1',
      data: { weight: 1, is_directed: true },
    },
  ] as AppEdge[];

const seedConstellation = (): void => {
  store().loadConstellation('orion', makeNodes(), makeEdges());
};

/** reactflow exige los handles en el tipo Connection. */
const connect = (source: string, target: string): Connection => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
});

const shapeOf = () => ({
  nodeIds: store().nodes.map((node) => node.id),
  nodePositions: store().nodes.map((node) => node.position),
  edgeIds: store().edges.map((edge) => edge.id),
});

const edgeById = (edgeId: string): AppEdge => {
  const edge = store().edges.find((current) => current.id === edgeId);
  if (!edge) throw new Error(`no existe la arista ${edgeId}`);
  return edge;
};

beforeEach(() => {
  // Siempre arranco libre: el store es un singleton compartido.
  store().setStructureLocked(false);
  store().clearGraph();
});

describe('store - constelación protegida', () => {
  it('loadConstellation activa el bloqueo y guarda el id de la plantilla', () => {
    seedConstellation();

    expect(store().structureLocked).toBe(true);
    expect(store().constellationId).toBe('orion');
    expect(store().nodes).toHaveLength(3);
    expect(store().edges).toHaveLength(2);
  });

  it('rechaza agregar nodos sin tocar el grafo', () => {
    seedConstellation();
    const before = shapeOf();

    expect(store().addNode({ x: 999, y: 999 })).toBe(false);
    expect(shapeOf()).toEqual(before);
  });

  it('rechaza eliminar un nodo y conserva sus aristas', () => {
    seedConstellation();
    const before = shapeOf();

    expect(store().deleteNode('betelgeuse')).toBe(false);
    expect(shapeOf()).toEqual(before);
  });

  it('rechaza eliminar una arista', () => {
    seedConstellation();
    const before = shapeOf();

    expect(store().deleteEdge('orion-betelgeuse-alnitak')).toBe(false);
    expect(shapeOf()).toEqual(before);
  });

  it('rechaza crear aristas con onConnect', () => {
    seedConstellation();
    const before = shapeOf();

    store().onConnect(connect('betelgeuse', 'bellatrix'));

    expect(shapeOf()).toEqual(before);
  });

  it('rechaza limpiar el grafo', () => {
    seedConstellation();
    const before = shapeOf();

    expect(store().clearGraph()).toBe(false);
    expect(shapeOf()).toEqual(before);
  });

  it('rechaza replaceGraph: ni importar ni "Enviar al editor" la pisan', () => {
    seedConstellation();
    const before = shapeOf();

    expect(store().replaceGraph(makeNodes().slice(0, 1), [])).toBe(false);
    expect(shapeOf()).toEqual(before);
  });

  it('filtra mover y borrar de onNodesChange, pero deja pasar la selección', () => {
    seedConstellation();
    const before = shapeOf();

    const changes: NodeChange[] = [
      { type: 'position', id: 'betelgeuse', position: { x: 999, y: 999 } },
      { type: 'remove', id: 'bellatrix' },
      { type: 'select', id: 'betelgeuse', selected: true },
    ];

    store().onNodesChange(changes);

    // La selección sí se aplica (es permitida)...
    expect(store().nodes.find((node) => node.id === 'betelgeuse')?.selected).toBe(true);
    // ...pero la posición y el borrado, no.
    expect(store().nodes.map((node) => node.id)).toEqual(before.nodeIds);
    expect(store().nodes.map((node) => node.position)).toEqual(before.nodePositions);
    expect(store().edges.map((edge) => edge.id)).toEqual(before.edgeIds);
  });

  it('filtra el borrado de onEdgesChange', () => {
    seedConstellation();
    const before = shapeOf();

    const changes: EdgeChange[] = [
      { type: 'remove', id: 'orion-betelgeuse-alnitak' },
      { type: 'select', id: 'orion-betelgeuse-alnitak', selected: true },
    ];

    store().onEdgesChange(changes);

    expect(edgeById('orion-betelgeuse-alnitak').selected).toBe(true);
    expect(shapeOf().edgeIds).toEqual(before.edgeIds);
  });

  it('permite renombrar estrellas y editar el data que usan los algoritmos', () => {
    seedConstellation();

    store().updateNodeData('betelgeuse', 'Mi supergigante roja');
    store().updateNodeData('bellatrix', { role: 'source', supply: 8 });

    const renamed = store().nodes.find((node) => node.id === 'betelgeuse');
    expect(renamed?.data.label).toBe('Mi supergigante roja');

    const withRole = store().nodes.find((node) => node.id === 'bellatrix');
    expect(withRole?.data.role).toBe('source');
    expect(withRole?.data.supply).toBe(8);
  });

  it('permite cambiar peso y dirección de una arista', () => {
    seedConstellation();

    store().updateEdgeData('orion-betelgeuse-alnitak', 4.5, true);
    expect(edgeById('orion-betelgeuse-alnitak').data?.weight).toBe(4.5);
    expect(edgeById('orion-betelgeuse-alnitak').data?.is_directed).toBe(true);

    store().updateEdgeData('orion-betelgeuse-alnitak', 2, false);
    expect(edgeById('orion-betelgeuse-alnitak').data?.is_directed).toBe(false);
  });

  it('permite invertir una arista dirigida', () => {
    seedConstellation();

    store().reverseEdge('orion-betelgeuse-alnitak');

    const reversed = edgeById('orion-betelgeuse-alnitak');
    expect(reversed.source).toBe('alnitak');
    expect(reversed.target).toBe('betelgeuse');
  });

  it('setAllEdgesDirected cambia todas las direcciones sin tocar la forma', () => {
    seedConstellation();
    const before = shapeOf();

    store().setAllEdgesDirected(false);
    expect(store().edges.every((edge) => edge.data?.is_directed === false)).toBe(true);
    expect(shapeOf()).toEqual(before);

    store().setAllEdgesDirected(true);
    expect(store().edges.every((edge) => edge.data?.is_directed === true)).toBe(true);
    expect(shapeOf()).toEqual(before);
  });

  it('cargar un grafo libre DESACTIVA el bloqueo', () => {
    seedConstellation();

    store().loadGraph(makeNodes().slice(0, 1), []);

    expect(store().structureLocked).toBe(false);
    expect(store().constellationId).toBeNull();

    // Y una vez libre, todo vuelve a estar permitido.
    expect(store().addNode({ x: 0, y: 0 })).toBe(true);
    expect(store().clearGraph()).toBe(true);
  });

  it('setStructureLocked(false) también libera y borra el id', () => {
    seedConstellation();

    store().setStructureLocked(false);

    expect(store().structureLocked).toBe(false);
    expect(store().constellationId).toBeNull();
  });
});

describe('store - regresión con grafo libre', () => {
  it('sin bloqueo todas las operaciones siguen permitidas', () => {
    store().loadGraph(makeNodes(), makeEdges());

    expect(store().structureLocked).toBe(false);
    expect(store().addNode({ x: 500, y: 500 })).toBe(true);
    expect(store().nodes).toHaveLength(4);

    store().onNodesChange([
      { type: 'position', id: 'betelgeuse', position: { x: 999, y: 999 } },
    ]);
    expect(store().nodes.find((node) => node.id === 'betelgeuse')?.position).toEqual({
      x: 999,
      y: 999,
    });

    expect(store().onConnect(connect('betelgeuse', 'bellatrix'))).toBeUndefined();
    expect(store().edges).toHaveLength(3);

    expect(store().deleteEdge('orion-betelgeuse-alnitak')).toBe(true);
    expect(store().deleteNode('bellatrix')).toBe(true);
    expect(store().edges.some((edge) => edge.source === 'bellatrix')).toBe(false);

    expect(store().replaceGraph(makeNodes().slice(0, 1), [])).toBe(true);
    expect(store().nodes).toHaveLength(1);

    expect(store().clearGraph()).toBe(true);
    expect(store().nodes).toHaveLength(0);
  });
});
