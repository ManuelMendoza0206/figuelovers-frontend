import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  constellationAssetUrl,
  loadConstellationCatalog,
  loadConstellationGraph,
  resetConstellationCatalogCache,
  validateConstellationGraph,
} from './constellationCatalog';
import { graphPayloadToFlow } from './graphFile';
import { translateGraphToCostMatrix } from './graphToMatrix';
import { translateGraphToNorthwest } from './graphToNorthwest';
import type { GraphFileSchema } from '../types/graph';

/**
 * El catálogo es la única puerta a las constelaciones: si falla, la
 * sección entera deja de servir. Por eso aca se prueban DOS cosas:
 *
 *   1. Los JSON REALES que viven en public/constellations (no fixtures
 *      inventados): nadie los rehace, solo se valida que sigan servibles.
 *   2. El aislamiento de fallos: un archivo roto rompe SU tarjeta, no la
 *      galería completa.
 */

// Vitest corre con cwd en la raíz del frontend, así que los archivos
// estáticos se leen por ruta directa (en jsdom `import.meta.url` no es
// un file:// confiable).
const PUBLIC_DIR = resolve(process.cwd(), 'public/constellations');

const readPublic = (file: string): string => readFileSync(resolve(PUBLIC_DIR, file), 'utf8');

/** Responde solo las rutas que el test registra; el resto, 404. */
const stubFetch = (routes: Record<string, string>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = routes[url];

      if (typeof body === 'undefined') {
        return {
          ok: false,
          status: 404,
          text: async () => '',
          json: async () => {
            throw new Error('sin cuerpo');
          },
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => body,
        json: async () => JSON.parse(body),
      };
    })
  );
};

const realIndex = JSON.parse(readPublic('index.json')) as {
  id: string;
  file: string;
}[];

const realRoutes = (): Record<string, string> => ({
  [constellationAssetUrl('constellations/index.json')]: readPublic('index.json'),
  ...Object.fromEntries(
    realIndex.map((entry) => [
      constellationAssetUrl(`constellations/${entry.file}`),
      readPublic(entry.file),
    ])
  ),
});

const fileWith = (graph: Partial<GraphFileSchema['graph']>): GraphFileSchema =>
  ({
    metadata: { version: '1.0.0', name: 'Prueba', created_at: '2026-01-01T00:00:00Z' },
    graph: { nodes: [], edges: [], ...graph },
  }) as GraphFileSchema;

beforeEach(() => {
  resetConstellationCatalogCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetConstellationCatalogCache();
});

describe('validateConstellationGraph', () => {
  it('acepta los cinco archivos reales del catálogo', () => {
    realIndex.forEach((entry) => {
      const parsed = JSON.parse(readPublic(entry.file)) as GraphFileSchema;
      expect(validateConstellationGraph(parsed), entry.file).toEqual([]);
    });
  });

  it('detecta ids repetidos, aristas colgantes y nodos sin posición', () => {
    const problems = validateConstellationGraph(
      fileWith({
        nodes: [
          { id: 'a', position: { x: 0, y: 0 } },
          { id: 'a', position: { x: 1, y: 1 } },
          { id: 'b' },
        ],
        edges: [{ id: 'e1', source: 'a', target: 'fantasma', weight: 1, is_directed: false }],
      })
    );

    expect(problems.join(' ')).toMatch(/repetido/);
    expect(problems.join(' ')).toMatch(/inexistente: "fantasma"/);
    expect(problems.join(' ')).toMatch(/"b" no tiene position/);
  });

  it('detecta pesos negativos en aristas no dirigidas, duplicadas y bucles', () => {
    const problems = validateConstellationGraph(
      fileWith({
        nodes: [
          { id: 'a', position: { x: 0, y: 0 } },
          { id: 'b', position: { x: 1, y: 1 } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b', weight: -3, is_directed: false },
          { id: 'e2', source: 'b', target: 'a', weight: 1, is_directed: true },
          { id: 'e3', source: 'a', target: 'a', weight: 1, is_directed: false },
        ],
      })
    );

    expect(problems.join(' ')).toMatch(/peso negativo/);
    expect(problems.join(' ')).toMatch(/más de una vez/);
    expect(problems.join(' ')).toMatch(/bucle/);
  });
});

describe('loadConstellationCatalog', () => {
  it('carga el índice y los archivos reales sin errores', async () => {
    stubFetch(realRoutes());

    const cards = await loadConstellationCatalog();

    expect(cards.map((card) => card.id)).toEqual(['orion', 'osa-mayor', 'casiopea']);

    cards.forEach((card) => {
      expect(card.error, card.id).toBeNull();
      expect(card.graph, card.id).not.toBeNull();
      // El número del índice tiene que corresponder a las estrellas reales.
      expect(card.graph?.graph.nodes.length, card.id).toBe(card.stars);
      expect(card.graph?.graph.edges.length, card.id).toBeGreaterThan(0);
    });
  });

  it('aisla un archivo inválido: esa tarjeta falla y las demás siguen', async () => {
    const routes = realRoutes();

    // Orión deja de ser un grafo y pasa a ser un archivo roto: la única
    // consecuencia tiene que ser SU tarjeta.
    routes[constellationAssetUrl('constellations/orion.json')] = 'esto no es un json';

    stubFetch(routes);

    const cards = await loadConstellationCatalog();

    expect(cards).toHaveLength(3);

    const orion = cards.find((card) => card.id === 'orion');
    expect(orion?.graph).toBeNull();
    expect(orion?.error).toMatch(/no contiene un JSON válido/);

    const osaMayor = cards.find((card) => card.id === 'osa-mayor');
    expect(osaMayor?.error).toBeNull();
    expect(osaMayor?.graph?.graph.nodes).toHaveLength(7);

    const casiopea = cards.find((card) => card.id === 'casiopea');
    expect(casiopea?.error).toBeNull();
    expect(casiopea?.graph?.graph.nodes).toHaveLength(5);
  });

  it('rechaza un índice que no sea una lista', async () => {
    stubFetch({
      [constellationAssetUrl('constellations/index.json')]: '{"no":"lista"}',
    });

    await expect(loadConstellationCatalog()).rejects.toThrow(/lista JSON/);
    // No se cachea el fallo del índice: merece un reintento.
    await expect(loadConstellationCatalog()).rejects.toThrow(/lista JSON/);
  });

  it('marca en la tarjeta una entrada del índice incompleta', async () => {
    stubFetch({
      [constellationAssetUrl('constellations/index.json')]:
        '[{"id":"incompleta","name":"Incompleta","file":"incompleta.json","description":"x"}]',
    });

    const cards = await loadConstellationCatalog();

    expect(cards).toHaveLength(1);
    expect(cards[0]?.graph).toBeNull();
    expect(cards[0]?.error).toMatch(/falta: stars/);
  });

  it('cachea el catálogo: la segunda llamada no vuelve a pedir nada', async () => {
    const routes = realRoutes();
    stubFetch(routes);

    await loadConstellationCatalog();
    await loadConstellationCatalog();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(Object.keys(routes).length);
  });

  it('explica el motivo real cuando el JSON está malformado', async () => {
    stubFetch({
      [constellationAssetUrl('constellations/index.json')]:
        '[{"id":"mala","name":"Mala","file":"mala.json","description":"x","stars":1}]',
      [constellationAssetUrl('constellations/mala.json')]:
        '{"metadata":{},"graph":{"nodes":[{"id":"a","position":{"x":0,"y":0}}],"edges":[{"id":"e","source":"a","target":"z","weight":1,"is_directed":false}]}}',
    });

    const cards = await loadConstellationCatalog();

    expect(cards[0]?.graph).toBeNull();
    expect(cards[0]?.error).toMatch(/inexistente: "z"/);
  });

  it('loadConstellationGraph devuelve la plantilla por id', async () => {
    stubFetch(realRoutes());

    const graph = await loadConstellationGraph('osa-mayor');

    expect(graph.metadata.name).toBe('Osa Mayor');
    expect(graph.graph.nodes).toHaveLength(7);

    await expect(loadConstellationGraph('no-existe')).rejects.toThrow(/No existe/);
  });
});

/**
 * La prueba de que las plantillas SIRVEN: no solo que los JSON estén bien
 * formados, sino que las utilidades reales de Norwest y Asignación las
 * puedan traducir. Es lo que hace que abrir Orión no termine en un
 * pantalla de error.
 */
describe('constelaciones reales con las utilidades de algoritmos', () => {
  it('Orión se traduce a una matriz de asignación válida', async () => {
    stubFetch(realRoutes());

    const graph = await loadConstellationGraph('orion');
    const { nodes, edges } = graphPayloadToFlow(graph.graph);

    const result = translateGraphToCostMatrix(
      nodes.map((node) => ({ id: node.id, label: node.data?.label ?? '' })),
      edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data?.weight ?? 1,
        isDirected: edge.data?.is_directed === true,
      })),
      'minimize'
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.translation.matrix).toHaveLength(graph.graph.nodes.length);
    result.translation.matrix.forEach((row) => {
      expect(row).toHaveLength(graph.graph.nodes.length);
      row.forEach((cell) =>
        expect(cell === null || Number.isFinite(cell)).toBe(true)
      );
    });
  });

  it('Osa Mayor con roles armados a mano produce costos de Norwest', async () => {
    stubFetch(realRoutes());

    const graph = await loadConstellationGraph('osa-mayor');
    const { nodes, edges } = graphPayloadToFlow(graph.graph);

    // Misma edición que un usuario haría en el editor protegido: la forma
    // no cambia, solo el data que leen los algoritmos.
    const withRoles = nodes.map((node) => {
      if (node.id === 'dubhe') {
        return {
          ...node,
          data: { ...node.data, role: 'source' as const, supply: 5 },
        };
      }
      if (node.id === 'merak') {
        return {
          ...node,
          data: { ...node.data, role: 'sink' as const, demand: 5 },
        };
      }
      return { ...node, data: { ...node.data, role: 'none' as const } };
    });

    const result = translateGraphToNorthwest(
      withRoles,
      edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data?.weight ?? 1,
        isDirected: edge.data?.is_directed === true,
      }))
    );

    expect(result.roles.dubhe).toBe('source');
    expect(result.roles.merak).toBe('sink');
    expect(result.origins.map((origin) => origin.id)).toEqual(['dubhe']);
    expect(result.destinations.map((destination) => destination.id)).toEqual(['merak']);
    // Dubhe y Merak son las dos de la ladra: la línea del carro que une
    // origen y destino existe en la plantilla.
    expect(result.costs).toEqual([[1]]);
  });
});
