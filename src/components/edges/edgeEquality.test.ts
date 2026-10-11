import { describe, expect, it } from 'vitest';

import type { EdgeProps } from 'reactflow';

import { areEdgePropsEqual } from './edgeEquality';
import type { WeightedEdgeData } from './edgeEquality';

const edge = (
  overrides: Partial<EdgeProps<WeightedEdgeData>> = {}
): EdgeProps<WeightedEdgeData> =>
  ({
    id: 'e1',
    source: 'A',
    target: 'B',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 50,
    sourcePosition: 'right',
    targetPosition: 'left',
    markerEnd: undefined,
    markerStart: undefined,
    style: { stroke: '#72e6e0', strokeWidth: 2.5 },
    selected: false,
    animated: false,
    label: '1',
    labelStyle: {},
    labelShowBg: false,
    labelBgStyle: {},
    labelBgPadding: [2, 4],
    labelBgBorderRadius: 3,
    interactionWidth: 20,
    data: { isCurved: false, curveSign: 0, normalX: 0, normalY: 0 },
    ...overrides,
  }) as EdgeProps<WeightedEdgeData>;

describe('areEdgePropsEqual', () => {
  it('ignora un objeto data nuevo pero equivalente (el caso real de GraphCanvas)', () => {
    // GraphCanvas reconstruye `data` en cada recomputacion, asi que la
    // identidad cambia aunque el contenido sea identico. Este es el
    // motivo de existir del comparator.
    const prev = edge();
    const next = edge({ data: { isCurved: false, curveSign: 0, normalX: 0, normalY: 0 } });

    expect(prev.data).not.toBe(next.data);
    expect(areEdgePropsEqual(prev, next)).toBe(true);
  });

  it('detecta un cambio de geometria de la curva', () => {
    const prev = edge({ data: { isCurved: true, curveSign: 1, normalX: 0, normalY: 1 } });
    const next = edge({ data: { isCurved: true, curveSign: -1, normalX: 0, normalY: 1 } });

    expect(areEdgePropsEqual(prev, next)).toBe(false);
  });

  it('detecta aparecer o desaparecer del self-loop', () => {
    const prev = edge({ data: { isSelfLoop: false, loopCenterX: 0, loopCenterY: 0 } });
    const next = edge({ data: { isSelfLoop: true, loopCenterX: 0, loopCenterY: 0 } });

    expect(areEdgePropsEqual(prev, next)).toBe(false);
  });

  it('repinta cuando se arrastra un nodo vecino (sourceX cambia)', () => {
    const prev = edge();
    const next = edge({ sourceX: 12 });

    expect(areEdgePropsEqual(prev, next)).toBe(false);
  });

  it('repinta cuando cambia targetY', () => {
    expect(areEdgePropsEqual(edge(), edge({ targetY: 999 }))).toBe(false);
  });

  it('repinta al seleccionar la arista', () => {
    expect(areEdgePropsEqual(edge(), edge({ selected: true }))).toBe(false);
  });

  it('repinta cuando cambia el peso visible', () => {
    expect(areEdgePropsEqual(edge(), edge({ label: '42' }))).toBe(false);
  });

  it('repinta cuando cambia el id', () => {
    expect(areEdgePropsEqual(edge(), edge({ id: 'e2' }))).toBe(false);
  });

  it('repinta cuando cambia el marker (dirigida <-> no dirigida)', () => {
    const prev = edge();
    const next = edge({ markerEnd: { type: 'arrowclosed' } as never });

    expect(areEdgePropsEqual(prev, next)).toBe(false);
  });

  it('compara el style por valor, no por identidad', () => {
    const prev = edge({ style: { stroke: '#72e6e0', strokeWidth: 2.5 } });
    const next = edge({ style: { stroke: '#72e6e0', strokeWidth: 2.5 } });

    expect(prev.style).not.toBe(next.style);
    expect(areEdgePropsEqual(prev, next)).toBe(true);
  });

  it('detecta un color de arista distinto', () => {
    expect(
      areEdgePropsEqual(
        edge({ style: { stroke: '#72e6e0' } }),
        edge({ style: { stroke: '#ff0000' } })
      )
    ).toBe(false);
  });

  it('detecta una clave de style agregada', () => {
    expect(
      areEdgePropsEqual(
        edge({ style: { stroke: '#72e6e0' } }),
        edge({ style: { stroke: '#72e6e0', strokeDasharray: '4' } })
      )
    ).toBe(false);
  });

  it('tolera data ausente en ambos lados', () => {
    const prev = edge({ data: undefined });
    const next = edge({ data: undefined });

    expect(areEdgePropsEqual(prev, next)).toBe(true);
  });

  it('tolera data ausente contra data con defaults neutrales', () => {
    const prev = edge({ data: undefined });
    const next = edge({ data: {} });

    expect(areEdgePropsEqual(prev, next)).toBe(true);
  });

  it('repinta cuando la arista se apaga al seleccionar otra cosa', () => {
    const prev = edge({ data: { isLit: true } });
    const next = edge({ data: { isLit: false } });

    expect(areEdgePropsEqual(prev, next)).toBe(false);
  });

  it('trata isLit ausente como encendido (sin seleccion todo brilla)', () => {
    const prev = edge({ data: { isLit: true } });
    const next = edge({ data: {} });

    expect(areEdgePropsEqual(prev, next)).toBe(true);
  });
});