/**
 * Traduccion de la pizarra de grafos a un problema de asignacion.
 *
 * Modelo: cada nodo es a la vez una fila (estrella origen) y una
 * columna (estella destino). La celda [i][j] es el peso de la arista
 * i -> j. Una arista dirigida puebla solo esa celda; una no dirigida
 * puebla (i,j) y (j,i). La diagonal se prohibe salvo que exista un
 * self-loop explicito.
 *
 * Es una funcion pura y determinista: sin estado, sin red, sin reloj.
 * No depende de los tipos de reactflow a proposito, para que se pueda
 * testear y transportar por el router sin arrastrar el canvas.
 */

export type AssignmentObjective = 'minimize' | 'maximize';

/** Nodo reducido a lo que la traduccion necesita. */
export interface GraphTransferNode {
  id: string;
  label?: string | null;
}

/** Arista reducida a lo que la traduccion necesita. */
export interface GraphTransferEdge {
  source: string;
  target: string;
  weight?: number | null;
  isDirected?: boolean;
}

/** Lo que viaja por el router state desde la pizarra. */
export interface GraphAssignmentTransfer {
  nodes: GraphTransferNode[];
  edges: GraphTransferEdge[];
}

/**
 * Tope de nodos. Como la traduccion produce una matriz N x N, este
 * valor tiene que coincidir con MAX_DIMENSION de AssignmentPage.tsx y
 * con MAX_ASSIGNMENT_DIMENSION del backend.
 */
export const MAX_GRAPH_NODES = 20;

export interface GraphTranslation {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  objective: AssignmentObjective;
  edgeCount: number;
  /**
   * Pares [fila, columna] que quedaron en 0 porque el grafo no tiene
   * esa conexion. NO son celdas bloqueadas: son editables como
   * cualquier otra. El conteo solo se usa para avisarle al usuario
   * cuantas tiene que revisar antes de confiarle el resultado al
   * algoritmo.
   */
  emptyCells: [number, number][];
}

export interface GraphTranslationBlocked {
  reason: string;
}

export type GraphTranslationResult =
  | { ok: true; translation: GraphTranslation }
  | { ok: false; blocked: GraphTranslationBlocked };

const labelOf = (node: GraphTransferNode): string =>
  node.label?.trim() || node.id;

const weightOf = (edge: GraphTransferEdge): number =>
  typeof edge.weight === 'number' && Number.isFinite(edge.weight)
    ? edge.weight
    : 1;

/**
 * Las celdas sin conexion arrancan en 0 y quedan EDITABLES.
 *
 * Ojo con la consecuencia, porque es real: 0 es el valor mas barato, asi
 * que si dejas las celdas en cero el hungaro va a elegir exactamente
 * esas asignaciones (las que no existen en la constelación). La
 * traduccion te da el punto de partida, no la respuesta: revisa las
 * `emptyCells` y poneles el costo real, o un valor alto si querés que
 * esa pareja quede prohibida.
 *
 * Se decidio NO usar un sentinel automatico (un numero grande Derived
 * del rango de pesos) justamente para que la celda siga siendo un input
 * normal que el usuario puede tocar y entender.
 */
export const translateGraphToCostMatrix = (
  nodes: GraphTransferNode[],
  edges: GraphTransferEdge[] = [],
  objective: AssignmentObjective = 'minimize'
): GraphTranslationResult => {
  if (nodes.length < 2) {
    return {
      ok: false,
      blocked: {
        reason: 'Necesitás al menos 2 nodos para armar la matriz de asignación.',
      },
    };
  }

  if (nodes.length > MAX_GRAPH_NODES) {
    return {
      ok: false,
      blocked: {
        reason: `La matriz sería de ${nodes.length}×${nodes.length}. El máximo es ${MAX_GRAPH_NODES}×${MAX_GRAPH_NODES}.`,
      },
    };
  }

  if (edges.length === 0) {
    return {
      ok: false,
      blocked: {
        reason:
          'El grafo no tiene conexiones, así que todas las celdas quedarían prohibidas y el resultado no aportaría información.',
      },
    };
  }

  const labels = nodes.map(labelOf);
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const n = nodes.length;

  const matrix: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0)
  );

  // Celdas que una arista toco, para poder distinguir las que quedan
  // en 0 por falta de conexion de las que valen 0 de verdad.
  const filled = new Set<string>();
  let edgeCount = 0;

  for (const edge of edges) {
    const sourceIndex = indexById.get(edge.source);
    const targetIndex = indexById.get(edge.target);

    // Arista colgando de un nodo que ya no existe.
    if (sourceIndex === undefined || targetIndex === undefined) {
      continue;
    }

    const weight = weightOf(edge);
    const isDirected = edge.isDirected === true;

    edgeCount += 1;

    const mark = (r: number, c: number): void => {
      // Ante duplicados gana la arista mas reciente.
      matrix[r][c] = weight;
      filled.add(`${r},${c}`);
    };

    mark(sourceIndex, targetIndex);

    // Una no dirigida habilita tambien el sentido inverso. El self-loop
    // ya cae en mark de arriba y no se duplica.
    if (!isDirected && sourceIndex !== targetIndex) {
      mark(targetIndex, sourceIndex);
    }
  }

  if (edgeCount === 0) {
    return {
      ok: false,
      blocked: {
        reason: 'Ninguna arista conecta dos nodos válidos de la constelación.',
      },
    };
  }

  const emptyCells: [number, number][] = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!filled.has(`${r},${c}`)) {
        emptyCells.push([r, c]);
      }
    }
  }

  return {
    ok: true,
    translation: {
      matrix,
      rowLabels: labels,
      colLabels: labels,
      objective,
      edgeCount,
      emptyCells,
    },
  };
};