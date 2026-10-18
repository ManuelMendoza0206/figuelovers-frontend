import { beforeEach, describe, expect, it } from 'vitest';

import type { AppEdge, AppNode, JohnsonResultData } from '../types/graph';
import {
  buildJohnsonGraphSignature,
  getJohnsonPath,
  getJohnsonPathEdgeIds,
  isJohnsonResultFresh,
  useJohnsonResult,
} from './useJohnsonResult';

const node = (id: string, label = id): AppNode =>
  ({
    id,
    position: { x: 0, y: 0 },
    data: { label, folio: 1 },
  }) as AppNode;

const edge = (id: string, source: string, target: string, weight = 1): AppEdge =>
  ({
    id,
    source,
    target,
    data: { weight, is_directed: true },
  }) as AppEdge;

const result = (paths: Record<string, Record<string, string[]>>): JohnsonResultData => ({
  distances: { A: { B: 4, C: 7 }, B: { C: 3 }, C: {} },
  paths,
  has_negative_cycle: false,
});

beforeEach(() => {
  useJohnsonResult.getState().clearJohnsonResult();
});

describe('buildJohnsonGraphSignature', () => {
  it('ignora los renombres porque no cambian las distancias', () => {
    const antes = buildJohnsonGraphSignature(
      [node('A', 'Alpha'), node('B', 'Beta')],
      [edge('e1', 'A', 'B', 4)]
    );
    const despues = buildJohnsonGraphSignature(
      [node('A', 'Otro'), node('B', 'Nombre')],
      [edge('e1', 'A', 'B', 4)]
    );

    expect(despues).toBe(antes);
  });

  it('cambia si cambia un peso o la topologia', () => {
    const base = buildJohnsonGraphSignature(
      [node('A'), node('B')],
      [edge('e1', 'A', 'B', 4)]
    );

    expect(
      buildJohnsonGraphSignature(
        [node('A'), node('B')],
        [edge('e1', 'A', 'B', 9)]
      )
    ).not.toBe(base);

    expect(
      buildJohnsonGraphSignature(
        [node('A'), node('B')],
        [edge('e1', 'B', 'A', 4)]
      )
    ).not.toBe(base);
  });
});

describe('isJohnsonResultFresh', () => {
  it('solo es valido mientras el grafo coincide con el calculado', () => {
    const nodes = [node('A'), node('B')];
    const edges = [edge('e1', 'A', 'B', 4)];
    const signature = buildJohnsonGraphSignature(nodes, edges);
    const data = result({ A: { B: ['A', 'B'] } });

    expect(isJohnsonResultFresh(data, signature, nodes, edges)).toBe(true);

    const cambiado = [node('A'), node('B')];
    const aristas = [edge('e1', 'A', 'B', 99)];
    expect(isJohnsonResultFresh(data, signature, cambiado, aristas)).toBe(false);
    expect(isJohnsonResultFresh(null, signature, nodes, edges)).toBe(false);
    expect(isJohnsonResultFresh(data, null, nodes, edges)).toBe(false);
  });
});

describe('getJohnsonPath / getJohnsonPathEdgeIds', () => {
  it('devuelve el camino y mapea cada paso a su arista exacta', () => {
    const data = result({ A: { C: ['A', 'B', 'C'] } });
    const edges = [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'A', 'C')];

    expect(getJohnsonPath(data, 'A', 'C')).toEqual(['A', 'B', 'C']);
    expect(getJohnsonPathEdgeIds(edges, ['A', 'B', 'C'])).toEqual(['e1', 'e2']);
  });

  it('devuelve vacio cuando no hay camino o faltan extremos', () => {
    const data = result({ A: {} });

    expect(getJohnsonPath(data, 'A', 'C')).toEqual([]);
    expect(getJohnsonPath(data, '', 'C')).toEqual([]);
    expect(getJohnsonPathEdgeIds([edge('e1', 'A', 'B')], ['A'])).toEqual([]);
  });
});

describe('useJohnsonResult', () => {
  it('conserva el resultado al navegar y lo limpia al cerrar', () => {
    const store = useJohnsonResult.getState();
    const data = result({ A: { B: ['A', 'B'] } });

    store.setJohnsonResult(data, 'firma-1', 'A', 'B');

    expect(useJohnsonResult.getState().result).toBe(data);
    expect(useJohnsonResult.getState().panel).toBe('floating');

    useJohnsonResult.getState().setJohnsonPanel('full');
    expect(useJohnsonResult.getState().panel).toBe('full');

    useJohnsonResult.getState().clearJohnsonResult();
    expect(useJohnsonResult.getState().result).toBeNull();
  });
});
