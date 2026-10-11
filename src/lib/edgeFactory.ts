import { MarkerType } from 'reactflow';

import type { CSSProperties } from 'react';

import type { AppEdge, AppEdgeData } from '../types/graph';

/**
 * Construccion y mutacion de aristas.
 *
 * Todo lo que decide COMO se ve o COMO se comporta una arista vive
 * aca, separado del store. Motivo concreto: `useGraphStore.ts` era el
 * archivo mas grande del proyecto y estas funciones eran logica pura
 * escondida entre `set(...)`.
 *
 * Todas son funciones puras: reciben estado y devuelven estado nuevo.
 */

export const BRAND_COLOR = '#72e6e0';

/**
 * Color del haz. Uno mas claro que la marca para que la linea se lea
 * como luz sobre el vacio y no como tinta sobre un panel.
 */
export const BEAM_COLOR = '#8ef0ea';

/**
 * Grosor del hilo en reposo. El haz de verdad es el halo que dibuja
 * `WeightedStraightEdge`; esta es solo la linea de luz.
 */
export const EDGE_STROKE_WIDTH = 1.6;

/** Opacidad del hilo cuando la constelacion esta encendida. */
export const BEAM_OPACITY = 0.55;

/** Opacidad del hilo cuando hay una seleccion y esta arista no la toca. */
export const BEAM_OPACITY_DIMMED = 0.16;

export const EDGE_Z_INDEX = 10;

export const createEdgeMarker = (): { type: MarkerType } => ({
  type: MarkerType.ArrowClosed,
});

export const createEdgeStyle = (
  overrides: CSSProperties = {}
): CSSProperties => ({
  stroke: BEAM_COLOR,
  strokeWidth: EDGE_STROKE_WIDTH,
  strokeLinecap: 'round',
  zIndex: EDGE_Z_INDEX,
  ...overrides,
});

export const DEFAULT_WEIGHT = 1;
export const DEFAULT_EDGE_LABEL = '1';

const randomSuffix = (): string =>
  Math.random().toString(36).slice(2, 8);

/**
 * Id de arista. Incluye timestamp + random porque se pueden crear
 * varias aristas A->B si el usuario las dibuja en sesiones distintas
 * y el store solo bloquea duplicados dentro de la sesion actual.
 */
export const createEdgeId = (source: string, target: string): string =>
  `e-${source}-${target}-${Date.now()}-${randomSuffix()}`;

export const createNodeId = (): string =>
  `node-${Date.now()}-${randomSuffix()}`;

/**
 * Traduce un handle de reactflow (`source-3` / `target-7`) al tipo
 * contrario. Al invertir una arista hay que intercambiar los handles
 * para que siga entrando y saliendo por el lado correcto del nodo.
 */
export const convertHandleDirection = (
  handleId: string | null | undefined,
  toType: 'source' | 'target'
): string | undefined => {
  if (!handleId) {
    return undefined;
  }

  if (handleId.startsWith('source-')) {
    return handleId.replace('source-', `${toType}-`);
  }

  if (handleId.startsWith('target-')) {
    return handleId.replace('target-', `${toType}-`);
  }

  return handleId;
};

/**
 * Ya existe una arista que ocupa el par (source, target)?
 *
 * Considera dos casos:
 *  - identico par: siempre duplicado.
 *  - par invertido sobre una arista NO dirigida: tambien duplicado,
 *    porque el usuario ya puede ir y volver por ahi.
 */
export const hasConflictingEdge = (
  edges: AppEdge[],
  source: string,
  target: string
): boolean =>
  edges.some((edge) => {
    const sameDirection = edge.source === source && edge.target === target;

    if (sameDirection) {
      return true;
    }

    const isLegacyUndirected =
      edge.data?.is_directed === false &&
      ((edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source));

    return isLegacyUndirected;
  });

/** Existe la arista inversa? Si existe, invertir dejaria dosDirected opuestas. */
export const hasReverseConflict = (
  edges: AppEdge[],
  edgeId: string,
  newSource: string,
  newTarget: string
): boolean =>
  edges.some(
    (edge) =>
      edge.id !== edgeId &&
      edge.source === newSource &&
      edge.target === newTarget
  );

export interface BuildEdgeInput {
  source: string;
  target: string;
  sourceHandle?: string | undefined;
  targetHandle?: string | undefined;
  weight?: number;
  isDirected?: boolean;
  id?: string;
}

/**
 * Arista nueva que sale de conectar dos handles del lienzo. Empieza
 * dirigida, con peso 1, que es el default que ve el usuario.
 */
export const buildEdge = (input: BuildEdgeInput): AppEdge => {
  const isDirected = input.isDirected ?? true;
  const weight = input.weight ?? DEFAULT_WEIGHT;

  const edge: AppEdge = {
    id: input.id ?? createEdgeId(input.source, input.target),
    type: 'straight',
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle ?? undefined,
    targetHandle: input.targetHandle ?? undefined,
    label: String(weight),
    data: { weight, is_directed: isDirected } satisfies AppEdgeData,
    markerEnd: isDirected ? createEdgeMarker() : undefined,
    style: createEdgeStyle(),
  };

  return edge;
};

/**
 * Copia de la arista con source/target invertidos y los handles
 * intercambiados. La operacion solo tiene sentido sobre aristas
 * dirigidas: el store valida eso antes de llamar.
 */
export const buildReversedEdge = (edge: AppEdge): AppEdge => ({
  ...edge,
  type: 'straight',
  source: edge.target,
  target: edge.source,
  sourceHandle: convertHandleDirection(edge.targetHandle, 'source'),
  targetHandle: convertHandleDirection(edge.sourceHandle, 'target'),
  data: {
    // El spread de `edge.data` dejaba `weight` opcional (reactflow
    // tipa data como `Data | null | undefined`) y una arista invertida
    // podia quedar sin peso numerico. Lo fijamos aqui.
    weight: edge.data?.weight ?? DEFAULT_WEIGHT,
    is_directed: true,
  },
  markerEnd: createEdgeMarker(),
  style: createEdgeStyle(),
});