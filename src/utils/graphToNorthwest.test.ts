import { describe, expect, it } from 'vitest';
import { translateGraphToNorthwest } from './graphToNorthwest';

describe('translateGraphToNorthwest', () => {
  it('infers source and sink roles and retains only valid source-to-sink costs', () => {
    const result = translateGraphToNorthwest(
      [
        { id: 'O', label: 'Origen', data: { supply: 8 } },
        { id: 'D', label: 'Destino', data: { demand: 8 } },
        { id: 'X', label: 'Intermedio' },
      ],
      [{ source: 'O', target: 'D', weight: 4, isDirected: true }]
    );

    expect(result.roles).toEqual({ O: 'source', D: 'sink', X: 'none' });
    expect(result.costs).toEqual([[4]]);
    expect(result.ignoredEdges).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('keeps a missing route null and accepts an undirected edge by roles', () => {
    const result = translateGraphToNorthwest(
      [
        { id: 'O', data: { role: 'source', supply: 3 } },
        { id: 'D1', data: { role: 'sink', demand: 2 } },
        { id: 'D2', data: { role: 'sink', demand: 1 } },
      ],
      [{ source: 'D1', target: 'O', weight: 9, isDirected: false }]
    );

    expect(result.costs).toEqual([[9, null]]);
  });

  it('reports edges between the wrong roles and rejects a reversed directed route', () => {
    const result = translateGraphToNorthwest(
      [
        { id: 'O', data: { role: 'source', supply: 4 } },
        { id: 'D', data: { role: 'sink', demand: 4 } },
        { id: 'X', data: { role: 'none' } },
      ],
      [
        { source: 'D', target: 'O', weight: 2, isDirected: true },
        { source: 'O', target: 'X', weight: 3, isDirected: true },
      ]
    );

    expect(result.costs).toEqual([[null]]);
    expect(result.ignoredEdges).toHaveLength(2);
    expect(result.warnings.join(' ')).toMatch(/ignoraron/i);
  });
});
