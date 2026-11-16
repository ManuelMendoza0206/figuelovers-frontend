import { describe, expect, it } from 'vitest';

import {
  createAlgorithmFile,
  parseAlgorithmFile,
  parseAlgorithmText,
  readAssignmentFileData,
  readGraphAlgorithmFileData,
  readSortFileData,
  readTreeFileData,
} from './algorithmFiles';

describe('algorithmFiles', () => {
  it('rechaza un archivo de otro algoritmo', () => {
    const file = createAlgorithmFile('sort', { values: [3, 1], algorithm: 'bubble' });
    expect(() => parseAlgorithmText(JSON.stringify(file), 'entrada.json', 'trees')).toThrow(
      /Este archivo es de Sort/
    );
  });

  it('rechaza un JSON con formato desconocido', () => {
    expect(() => parseAlgorithmText('{"values":[1,2]}', 'entrada.json', 'sort')).toThrow(
      /no tiene el formato/
    );
    expect(() => parseAlgorithmText('{roto', 'entrada.json', 'sort')).toThrow(/JSON válido/);
    expect(() => parseAlgorithmText('{}', 'entrada.txt', 'sort')).toThrow(/extensión \.json/);
  });

  it('lee un archivo JSON válido desde el navegador', async () => {
    const envelope = createAlgorithmFile('sort', {
      values: [9, 3, 7],
      algorithm: 'selection',
    });
    const file = new File([JSON.stringify(envelope)], 'sort.json', {
      type: 'application/json',
    });

    await expect(parseAlgorithmFile(file, 'sort')).resolves.toMatchObject({
      metadata: { kind: 'sort', version: 1 },
      data: { values: [9, 3, 7], algorithm: 'selection' },
    });
  });

  it('valida la entrada de Sort y su dirección', () => {
    expect(readSortFileData({ values: [9, 3, 7, 3], algorithm: 'merge' })).toEqual({
      values: [9, 3, 7, 3],
      algorithm: 'merge',
      direction: 'asc',
    });
    expect(
      readSortFileData({ values: [9, 3, 7, 3], algorithm: 'merge', direction: 'desc' })
    ).toEqual({
      values: [9, 3, 7, 3],
      algorithm: 'merge',
      direction: 'desc',
    });
    expect(() => readSortFileData({ values: [9], algorithm: 'merge' })).toThrow(
      /entre 2 y 40/
    );
    expect(() => readSortFileData({ values: [9, 3], algorithm: 'quick' })).toThrow(
      /algoritmo/
    );
    expect(() =>
      readSortFileData({ values: [9, 3], algorithm: 'merge', direction: 'sideways' })
    ).toThrow(/dirección/);
  });

  it('valida la matriz de Asignación', () => {
    const data = {
      rows: 2,
      cols: 2,
      maximize: false,
      matrix: [
        [4, null],
        [2, 8],
      ],
      rowLabels: ['A', 'B'],
      colLabels: ['X', 'Y'],
    };

    expect(readAssignmentFileData(data)).toEqual(data);
    expect(() => readAssignmentFileData({ ...data, cols: 3 })).toThrow(/no coinciden/);
    expect(() =>
      readAssignmentFileData({
        ...data,
        matrix: [
          [4, 'ocho'],
          [2, 8],
        ],
      })
    ).toThrow(/no son números/);
  });

  it('valida el estado de Árboles', () => {
    const data = {
      values: [2, 1, 3],
      order: 'inorder',
      treeView: {
        tree: {
          root_id: 'n2',
          nodes: [
            { id: 'n2', value: 2, left: 'n1', right: 'n3' },
            { id: 'n1', value: 1, left: null, right: null },
            { id: 'n3', value: 3, left: null, right: null },
          ],
          edges: [
            { source: 'n2', target: 'n1' },
            { source: 'n2', target: 'n3' },
          ],
        },
        traversals: {
          preorder: [2, 1, 3],
          inorder: [1, 2, 3],
          postorder: [1, 3, 2],
        },
        isBst: true,
      },
    };

    expect(readTreeFileData(data)).toEqual(data);
    expect(() => readTreeFileData({ ...data, order: 'levelorder' })).toThrow(
      /estado de árbol/
    );
    expect(() =>
      readTreeFileData({
        ...data,
        values: [2, 2, 3],
      })
    ).toThrow(/repetidos/);
  });

  it('valida el grafo y sus opciones', () => {
    const data = {
      graph: {
        nodes: [
          { id: 'A', label: 'Alfa', position: { x: 0, y: 0 }, data: { folio: 1 } },
          { id: 'B', label: 'Beta', position: { x: 100, y: 0 }, data: { folio: 2 } },
        ],
        edges: [
          {
            id: 'e1',
            source: 'A',
            target: 'B',
            weight: 4,
            is_directed: true,
          },
        ],
      },
      source: 'A',
      target: 'B',
      objective: 'max',
    };

    expect(readGraphAlgorithmFileData(data)).toMatchObject({
      source: 'A',
      target: 'B',
      objective: 'max',
    });
    expect(() => readGraphAlgorithmFileData({ graph: { nodes: [], edges: [] } })).not.toThrow();
    expect(() => readGraphAlgorithmFileData({ graph: { nodes: [{}], edges: [] } })).toThrow(
      /grafo válido/
    );
    expect(() =>
      readGraphAlgorithmFileData({ graph: { nodes: [], edges: [] }, objective: 'media' })
    ).toThrow(/objetivo/);
  });
});
