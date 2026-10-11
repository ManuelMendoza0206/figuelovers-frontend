import { describe, expect, it } from 'vitest';

import type { AppEdge, AppNode } from '../types/graph';
import {
  getBidirectionalCurveInfo,
  getDynamicEdgeHandles,
  getNodeCenter,
  getOppositeEdge,
  getSelfLoopHandles,
  getSelfLoopInfo,
  NO_CURVE,
  NO_SELF_LOOP,
} from './graphGeometry';

const node = (id: string, x: number, y: number): AppNode =>
  ({
    id,
    position: { x, y },
    data: { label: id, folio: 1 },
  }) as AppNode;

const edge = (
  id: string,
  source: string,
  target: string
): AppEdge =>
  ({
    id,
    source,
    target,
    data: { weight: 1, is_directed: true },
  }) as AppEdge;

const map = (...nodes: AppNode[]) =>
  new Map(nodes.map((n) => [n.id, n]));

describe('getNodeCenter', () => {
  it('suma el offset al centro del nodo', () => {
    const n = node('A', 100, 50);
    const center = getNodeCenter(n);

    // NODE_SIZE=76 -> radio 38
    expect(center.x).toBe(138);
    expect(center.y).toBe(88);
  });

  it('anda con posiciones negativas', () => {
    expect(getNodeCenter(node('A', -38, -38))).toEqual({ x: 0, y: 0 });
  });
});

describe('getOppositeEdge', () => {
  const a = edge('e1', 'A', 'B');
  const b = edge('e2', 'B', 'A');
  const c = edge('e3', 'A', 'C');

  it('encuentra la arista inversa', () => {
    expect(getOppositeEdge(a, [a, b])?.id).toBe('e2');
    expect(getOppositeEdge(b, [a, b])?.id).toBe('e1');
  });

  it('devuelve null si no hay inversa', () => {
    expect(getOppositeEdge(a, [a, c])).toBeNull();
  });

  it('no confunde una arista consigo misma', () => {
    expect(getOppositeEdge(a, [a])).toBeNull();
  });

  it('ignora un self-loop como inversa de si mismo', () => {
    const loop = edge('loop', 'A', 'A');
    expect(getOppositeEdge(loop, [loop])).toBeNull();
  });
});

describe('getBidirectionalCurveInfo', () => {
  it('no curva si no hay arista inversa', () => {
    const nodes = map(node('A', 0, 0), node('B', 200, 0));
    const info = getBidirectionalCurveInfo(edge('e1', 'A', 'B'), [edge('e1', 'A', 'B')], nodes);

    expect(info).toBe(NO_CURVE);
  });

  it('no curva si falta algun nodo del mapa', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    expect(getBidirectionalCurveInfo(a, [a, b], map(node('A', 0, 0)))).toBe(
      NO_CURVE
    );
  });

  it('no curva si los dos nodos estan en la misma posicion', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    const nodes = map(node('A', 100, 100), node('B', 100, 100));

    expect(getBidirectionalCurveInfo(a, [a, b], nodes)).toBe(NO_CURVE);
  });

  it('curva con una normal unitaria perpendicular al segmento', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    // A(0,0) B(200,0): el segmento es horizontal, la normal vertical.
    const nodes = map(node('A', 0, 0), node('B', 200, 0));

    const info = getBidirectionalCurveInfo(a, [a, b], nodes);

    expect(info.isCurved).toBe(true);
    // normal perpendicular: dx=0, dy=0 -> normal = (-0, 0)
    expect(info.normalY).toBeCloseTo(1, 6);
    expect(info.normalX).toBeCloseTo(0, 6);

    // La normal tiene largo 1.
    const largo = Math.hypot(info.normalX, info.normalY);
    expect(largo).toBeCloseTo(1, 6);
  });

  it('da signos opuestos a las dos aristas del par', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    const nodes = map(node('A', 0, 0), node('B', 200, 0));

    const infoA = getBidirectionalCurveInfo(a, [a, b], nodes);
    const infoB = getBidirectionalCurveInfo(b, [a, b], nodes);

    // Se separan para no superponerse.
    expect(infoA.curveSign).toBe(-infoB.curveSign);
    expect(infoA.normalX).toBeCloseTo(infoB.normalX, 6);
    expect(infoA.normalY).toBeCloseTo(infoB.normalY, 6);
  });

  it('comparte la MISMA normal entre las dos aristas del par', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    const nodes = map(node('A', 0, 0), node('B', 200, 100));

    const infoA = getBidirectionalCurveInfo(a, [a, b], nodes);
    const infoB = getBidirectionalCurveInfo(b, [a, b], nodes);

    // El normal se deriva de firstId -> secondId con IDs ordenados, no
    // del sentido de la arista. Por eso las dos comparten marco de
    // referencia y solo se separan por el signo: es lo que hace que la
    // curva sea consistente en vez de depender del lado desde el que se
    // dibuja.
    expect(infoA.normalX).toBeCloseTo(infoB.normalX, 6);
    expect(infoA.normalY).toBeCloseTo(infoB.normalY, 6);
    expect(infoA.curveSign).toBe(-infoB.curveSign);
  });

  it('el normal no depende del orden en que se pasan las aristas', () => {
    const a = edge('e1', 'A', 'B');
    const b = edge('e2', 'B', 'A');
    const nodes = map(node('A', 0, 0), node('B', 200, 100));

    const uno = getBidirectionalCurveInfo(a, [a, b], nodes);
    const otro = getBidirectionalCurveInfo(b, [b, a], nodes);

    expect(otro.normalX).toBeCloseTo(uno.normalX, 6);
    expect(otro.normalY).toBeCloseTo(uno.normalY, 6);
  });
});

describe('getSelfLoopInfo', () => {
  it('detecta el self-loop', () => {
    const loop = edge('loop', 'A', 'A');
    const info = getSelfLoopInfo(loop, map(node('A', 100, 100)));

    expect(info.isSelfLoop).toBe(true);
    expect(info.centerX).toBe(138);
    expect(info.centerY).toBe(138);
  });

  it('devuelve NO_SELF_LOOP si no es self-loop', () => {
    expect(getSelfLoopInfo(edge('e', 'A', 'B'), map(node('A', 0, 0), node('B', 1, 1)))).toBe(
      NO_SELF_LOOP
    );
  });

  it('devuelve NO_SELF_LOOP si el nodo no existe', () => {
    expect(getSelfLoopInfo(edge('loop', 'Z', 'Z'), map())).toBe(NO_SELF_LOOP);
  });
});

describe('getDynamicEdgeHandles', () => {
  it('cae al handle guardado si falta algun nodo', () => {
    const conHandles = {
      ...edge('e', 'A', 'B'),
      sourceHandle: 'source-3',
      targetHandle: 'target-7',
    } as AppEdge;

    const r = getDynamicEdgeHandles(conHandles, map(node('A', 0, 0)));

    expect(r.sourceHandle).toBe('source-3');
    expect(r.targetHandle).toBe('target-7');
  });

  it('devuelve indices de handle validos', () => {
    const r = getDynamicEdgeHandles(
      edge('e', 'A', 'B'),
      map(node('A', 0, 0), node('B', 200, 0))
    );

    // Formato source-<n> / target-<n>
    expect(r.sourceHandle).toMatch(/^source-\d+$/);
    expect(r.targetHandle).toMatch(/^target-\d+$/);
  });

  it('el nodo destino queda arriba cuando esta a la derecha', () => {
    // A(0,0) -> B(200,0): el destino mira hacia A, o sea izquierda.
    const r = getDynamicEdgeHandles(
      edge('e', 'A', 'B'),
      map(node('A', 0, 0), node('B', 200, 0))
    );

    const indice = Number(r.targetHandle?.replace('target-', ''));
    // CONNECTION_POINTS = 24, el 0 esta arriba (-PI/2).
    expect(indice).toBe(18); // izquierda = 18/24 de vuelta
  });

  it('el source y el target usan indices coherentes con la direccion', () => {
    const r = getDynamicEdgeHandles(
      edge('e', 'A', 'B'),
      map(node('A', 0, 0), node('B', 0, 200))
    );

    // Vertical: A abajo de B.
    expect(r.sourceHandle).toMatch(/^source-\d+$/);
    expect(r.targetHandle).toMatch(/^target-\d+$/);
  });
});

describe('getSelfLoopHandles', () => {
  it('devuelve handles source/target distintos', () => {
    const r = getSelfLoopHandles();

    expect(r.sourceHandle).toMatch(/^source-\d+$/);
    expect(r.targetHandle).toMatch(/^target-\d+$/);
    expect(r.sourceHandle).not.toBe(r.targetHandle);
  });

  it('es determinista', () => {
    expect(getSelfLoopHandles()).toEqual(getSelfLoopHandles());
  });
});