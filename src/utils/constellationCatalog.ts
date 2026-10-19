import type { GraphFileSchema } from '../types/graph';
import { parseGraphText } from './graphFile';

/**
 * Catálogo de constelaciones famosas.
 *
 * La fuente de verdad son DOS archivos estáticos, no código:
 *
 *   public/constellations/index.json   lista de entradas del catálogo
 *   public/constellations/<file>.json  el grafo de una constelación
 *
 * Agregar una constelación nueva es copiar su JSON y agregar una línea
 * al índice. Acá NO hay código por constelación: nada de `if (id ===
 * 'orion')`, que es exactamente lo que hace que el catálogo escale.
 *
 * Dos reglas de resiliencia, ambas probadas:
 *
 *   1. Un archivo inválido NO rompe la pantalla: esa tarjeta carga con
 *      su error y las demás siguen funcionando.
 *   2. Los resultados se cachean en memoria: volver a /constellations
 *      no re-descarga nada (son assets del propio build).
 */

/** Entrada tal como aparece en index.json. */
export interface ConstellationIndexEntry {
  id: string;
  name: string;
  file: string;
  description: string;
  stars: number;
}

/** Lo que consume la UI: la entrada del índice + el resultado de cargarla. */
export interface ConstellationCard extends ConstellationIndexEntry {
  /** Ruta resuelta contra BASE_URL (ya usable con fetch e <img>). */
  url: string;
  /** Grafo validado, o null si el archivo falló. */
  graph: GraphFileSchema | null;
  /** Mensaje legible del fallo, o null si cargó bien. */
  error: string | null;
}

export class ConstellationError extends Error {}

const INDEX_PATH = 'constellations/index.json';

/**
 * Ruta de un asset contra BASE_URL.
 *
 * `import.meta.env.BASE_URL` termina en '/' (por defecto '/', y en un
 * deploy bajo subcarpeta sería '/figuelovers/'), así que se normaliza
 * para no producir '//constellations/index.json'.
 */
export const constellationAssetUrl = (relativePath: string): string => {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  return `${base}/${relativePath.replace(/^\/+/, '')}`;
};

// ==========================================
// VALIDACIÓN ESTRUCTURAL DEL GRAFO
// ==========================================
//
// El parser (parseGraphText) chequea la FORMA del archivo: que exista
// `graph.nodes` y `graph.edges` como arrays. Esto agrega las reglas que
// el backend también espera y que un JSON escrito a mano puede romper
// sin darse cuenta: ids repetidos, aristas colgando, nodos sin
// posición, pesos negativos en aristas no dirigidas, aristas duplicadas
// y self-loops accidentales.
//
// Se devuelve una LISTA de problemas (no el primero que aparezca): al
// depurar un JSON propio conviene ver todo junto.

export const validateConstellationGraph = (file: GraphFileSchema): string[] => {
  const problems: string[] = [];
  const nodes = file.graph.nodes;
  const edges = file.graph.edges;

  const ids = new Set<string>();

  nodes.forEach((node, index) => {
    if (!node.id) {
      problems.push(`el nodo #${index + 1} no tiene id`);
      return;
    }

    if (ids.has(node.id)) {
      problems.push(`el id de nodo "${node.id}" está repetido`);
    }
    ids.add(node.id);

    if (
      !node.position ||
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number'
    ) {
      problems.push(`el nodo "${node.id}" no tiene position (x, y)`);
    }
  });

  // "a||b" sin distinguir dirección: detecta la misma pareja repetida
  // en cualquier orientación.
  const pairs = new Set<string>();

  edges.forEach((edge) => {
    if (!edge.id) {
      problems.push(`una arista entre "${edge.source}" y "${edge.target}" no tiene id`);
    }

    if (!ids.has(edge.source)) {
      problems.push(`la arista "${edge.id}" apunta a un nodo inexistente: "${edge.source}"`);
    }

    if (!ids.has(edge.target)) {
      problems.push(`la arista "${edge.id}" apunta a un nodo inexistente: "${edge.target}"`);
    }

    if (edge.source === edge.target) {
      problems.push(`la arista "${edge.id}" es un bucle sobre "${edge.source}"`);
    }

    if (typeof edge.weight !== 'number' || !Number.isFinite(edge.weight)) {
      problems.push(`la arista "${edge.id}" no tiene un peso numérico válido`);
    } else if (edge.weight < 0 && !edge.is_directed) {
      problems.push(
        `la arista "${edge.id}" tiene peso negativo (${edge.weight}) sin dirección; el backend la rechazaría`
      );
    }

    const pair = [edge.source, edge.target].sort().join('||');
    if (pairs.has(pair)) {
      problems.push(`la pareja "${edge.source}" → "${edge.target}" aparece más de una vez`);
    }
    pairs.add(pair);
  });

  return problems;
};

// ==========================================
// CARGA
// ==========================================

interface IndexEntryRaw extends Partial<ConstellationIndexEntry> {
  [key: string]: unknown;
}

let catalogCache: ConstellationCard[] | null = null;
let catalogRequest: Promise<ConstellationCard[]> | null = null;
const graphCache = new Map<string, GraphFileSchema>();

/**
 * Vuelve a pedir todo. Solo para tests y para el caso de "reintentar"
 * que puede usar la UI tras un fallo de red.
 */
export const resetConstellationCatalogCache = (): void => {
  catalogCache = null;
  catalogRequest = null;
  graphCache.clear();
};

const fetchIndexEntries = async (): Promise<IndexEntryRaw[]> => {
  let payload: unknown;

  try {
    const response = await fetch(constellationAssetUrl(INDEX_PATH));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    payload = await response.json();
  } catch {
    throw new ConstellationError(
      'No se pudo cargar el índice de constelaciones (constellations/index.json).'
    );
  }

  if (!Array.isArray(payload)) {
    throw new ConstellationError('El índice de constelaciones debe ser una lista JSON.');
  }

  return payload as IndexEntryRaw[];
};

/** Campos que cada entrada del índice debe traer para ser utilizable. */
const REQUIRED_INDEX_FIELDS = ['id', 'name', 'file', 'description', 'stars'] as const;

/** Carga y valida UN archivo; cualquier fallo queda en la tarjeta. */
const loadCard = async (entry: IndexEntryRaw): Promise<ConstellationCard> => {
  const id = typeof entry.id === 'string' ? entry.id : 'sin-id';
  const name = typeof entry.name === 'string' ? entry.name : id;
  const file = typeof entry.file === 'string' ? entry.file : '';
  const description = typeof entry.description === 'string' ? entry.description : '';
  const stars = typeof entry.stars === 'number' ? entry.stars : 0;

  const card: ConstellationCard = {
    id,
    name,
    file,
    description,
    stars,
    url: file ? constellationAssetUrl(`constellations/${file}`) : '',
    graph: null,
    error: null,
  };

  const missing = REQUIRED_INDEX_FIELDS.filter(
    (field) => typeof entry[field] === 'undefined'
  );

  if (missing.length > 0) {
    card.error = `Entrada del índice incompleta (falta: ${missing.join(', ')}).`;
    return card;
  }

  if (!file.toLowerCase().endsWith('.json')) {
    card.error = 'El archivo del índice no tiene extensión .json.';
    return card;
  }

  let text: string;
  try {
    const response = await fetch(card.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    text = await response.text();
  } catch {
    card.error = `No se pudo descargar ${file}.`;
    return card;
  }

  try {
    const parsed = await parseGraphText(text, file);
    const problems = validateConstellationGraph(parsed);

    if (problems.length > 0) {
      card.error = `${file} no es válido: ${problems[0]}.`;
      return card;
    }

    card.graph = parsed;
    graphCache.set(id, parsed);
  } catch (error) {
    card.error =
      error instanceof Error
        ? `${file}: ${error.message}`
        : `No se pudo leer ${file}.`;
  }

  return card;
};

/**
 * Índice + archivos, en una sola llamada para la UI.
 *
 * El índice es el único punto donde fallar "en bloque": si no se puede
 * leer, la pantalla entera muestra el error. Cada archivo, en cambio, se
 * aísla en su propia tarjeta.
 */
export const loadConstellationCatalog = async (): Promise<ConstellationCard[]> => {
  if (catalogCache) return catalogCache;
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    const entries = await fetchIndexEntries();
    const cards = await Promise.all(entries.map(loadCard));

    catalogCache = cards;
    return cards;
  })();

  try {
    return await catalogRequest;
  } catch (error) {
    // Un fallo del índice no se cachea: el usuario merece un reintento.
    catalogRequest = null;
    throw error;
  }
};

/**
 * Grafo de una constelación por id.
 *
 * Se usa para "restaurar original" y para abrir una plantilla. Devuelve
 * un error legible si el id no existe o si su archivo estaba inválido.
 */
export const loadConstellationGraph = async (
  constellationId: string
): Promise<GraphFileSchema> => {
  const cached = graphCache.get(constellationId);
  if (cached) return cached;

  const cards = await loadConstellationCatalog();
  const card = cards.find((item) => item.id === constellationId);

  if (!card) {
    throw new ConstellationError(
      `No existe "${constellationId}" en el índice de constelaciones.`
    );
  }

  if (!card.graph) {
    throw new ConstellationError(
      card.error ?? `No se pudo cargar la constelación "${constellationId}".`
    );
  }

  return card.graph;
};
