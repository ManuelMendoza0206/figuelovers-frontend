import type { CSSProperties } from 'react';
import type { EdgeProps } from 'reactflow';

/**
 * Datos de render que GraphCanvas calcula por arista y que
 * WeightedStraightEdge usa para decidir la geometria.
 *
 * Vive aparte del componente para dos razones:
 *  - el archivo del componente queda solo con componentes (regla de
 *    react-refresh),
 *  - `areEdgePropsEqual` se puede testear sin montar React.
 */
export interface WeightedEdgeData {
  isCurved?: boolean;
  normalX?: number;
  normalY?: number;
  curveSign?: number;
  isSelfLoop?: boolean;
  loopCenterX?: number;
  loopCenterY?: number;
  /**
   * Esta arista toca la seleccion actual (o no hay seleccion).
   * Decide si el haz queda encendido o atenuado, y si su pulso viaja.
   */
  isLit?: boolean;
}

const sameNumber = (a: number | undefined, b: number | undefined): boolean =>
  a === b || (a === undefined && b === undefined);

const sameStyle = (
  a: CSSProperties | undefined,
  b: CSSProperties | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[key as keyof CSSProperties] !== b[key as keyof CSSProperties]) {
      return false;
    }
  }
  return true;
};

/**
 * `React.memo` con shallow compare NO alcanzaria: GraphCanvas reconstruye
 * el objeto `data` de cada arista en cada recomputacion de
 * `displayEdges`, asi que la identidad siempre cambia y el shallow
 * compare daria "difierente" siempre.
 *
 * Por eso comparamos campo a campo lo que la arista efectivamente
 * dibuja: si ninguno cambio, el SVG resultante es identico y no vale la
 * pena repintarlo.
 *
 * Ojo: al arrastrar un nodo SI cambian sourceX/sourceY de las aristas
 * vecinas, y eso legitimamente debe repintarse. El comparator lo
 * respeta, que es justamente el punto de no comparar `position`.
 */
export const areEdgePropsEqual = (
  prev: EdgeProps<WeightedEdgeData>,
  next: EdgeProps<WeightedEdgeData>
): boolean => {
  if (prev.id !== next.id) return false;
  if (!sameNumber(prev.sourceX, next.sourceX)) return false;
  if (!sameNumber(prev.sourceY, next.sourceY)) return false;
  if (!sameNumber(prev.targetX, next.targetX)) return false;
  if (!sameNumber(prev.targetY, next.targetY)) return false;
  if (prev.selected !== next.selected) return false;
  if (prev.label !== next.label) return false;
  if (prev.markerEnd !== next.markerEnd) return false;
  if (prev.markerStart !== next.markerStart) return false;
  if (!sameStyle(prev.style, next.style)) return false;

  const prevData = prev.data;
  const nextData = next.data;

  if (prevData === nextData) return true;

  if (
    (prevData?.isCurved ?? false) !== (nextData?.isCurved ?? false) ||
    (prevData?.isSelfLoop ?? false) !== (nextData?.isSelfLoop ?? false) ||
    (prevData?.isLit ?? true) !== (nextData?.isLit ?? true) ||
    !sameNumber(prevData?.normalX, nextData?.normalX) ||
    !sameNumber(prevData?.normalY, nextData?.normalY) ||
    !sameNumber(prevData?.curveSign, nextData?.curveSign) ||
    !sameNumber(prevData?.loopCenterX, nextData?.loopCenterX) ||
    !sameNumber(prevData?.loopCenterY, nextData?.loopCenterY)
  ) {
    return false;
  }

  return true;
};