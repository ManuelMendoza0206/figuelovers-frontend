import React from 'react';
import type { EdgeProps } from 'reactflow';
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from 'reactflow';

import { BEAM_COLOR, BRAND_COLOR, PATH_COLOR } from '../../lib/graphEdge';
import {
    CURVE_CONTROL_POINT_OFFSET,
    CURVE_LABEL_OFFSET,
    SELF_LOOP_CONTROL_OFFSET,
    SELF_LOOP_LABEL_OFFSET,
    SELF_LOOP_LATERAL_SPREAD,
} from '../../lib/graphGeometry';

import type { WeightedEdgeData } from './edgeEquality';
import { areEdgePropsEqual } from './edgeEquality';

/**
 * Fase estable de una arista, derivada de su id. Sin estado ni
 * aleatoriedad en render: la misma arista centellea siempre igual.
 */
const hashEdgePhase = (id: string): number => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 9973;
  }

  return hash;
};

export function WeightedStraightEdge(props: EdgeProps<WeightedEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerEnd,
    markerStart,
    selected,
    label,
    data,
  } = props;

  const [straightPath, straightLabelX, straightLabelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const isCurved = data?.isCurved ?? false;
  const normalX = data?.normalX ?? 0;
  const normalY = data?.normalY ?? 0;
  const curveSign = data?.curveSign ?? 0;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const controlX = midX + normalX * curveSign * CURVE_CONTROL_POINT_OFFSET;
  const controlY = midY + normalY * curveSign * CURVE_CONTROL_POINT_OFFSET;

  const curvedPath = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;

  const isSelfLoop = data?.isSelfLoop ?? false;
  const loopCenterX = data?.loopCenterX ?? sourceX;
  const loopCenterY = data?.loopCenterY ?? sourceY;

  const selfLoopMidX = (sourceX + targetX) / 2;
  const selfLoopMidY = (sourceY + targetY) / 2;

  let selfLoopDirX = selfLoopMidX - loopCenterX;
  let selfLoopDirY = selfLoopMidY - loopCenterY;

  const selfLoopDirLength = Math.sqrt(selfLoopDirX * selfLoopDirX + selfLoopDirY * selfLoopDirY);

  if (selfLoopDirLength === 0) {
    selfLoopDirX = 0;
    selfLoopDirY = -1;
  } else {
    selfLoopDirX /= selfLoopDirLength;
    selfLoopDirY /= selfLoopDirLength;
  }

  const selfLoopPerpX = -selfLoopDirY;
  const selfLoopPerpY = selfLoopDirX;

  const selfLoopControl1X = sourceX + selfLoopDirX * SELF_LOOP_CONTROL_OFFSET - selfLoopPerpX * SELF_LOOP_LATERAL_SPREAD;
  const selfLoopControl1Y = sourceY + selfLoopDirY * SELF_LOOP_CONTROL_OFFSET - selfLoopPerpY * SELF_LOOP_LATERAL_SPREAD;
  const selfLoopControl2X = targetX + selfLoopDirX * SELF_LOOP_CONTROL_OFFSET + selfLoopPerpX * SELF_LOOP_LATERAL_SPREAD;
  const selfLoopControl2Y = targetY + selfLoopDirY * SELF_LOOP_CONTROL_OFFSET + selfLoopPerpY * SELF_LOOP_LATERAL_SPREAD;

  const selfLoopPath = `M ${sourceX},${sourceY} C ${selfLoopControl1X},${selfLoopControl1Y} ${selfLoopControl2X},${selfLoopControl2Y} ${targetX},${targetY}`;

  const selfLoopLabelX = selfLoopMidX + selfLoopDirX * SELF_LOOP_LABEL_OFFSET;
  const selfLoopLabelY = selfLoopMidY + selfLoopDirY * SELF_LOOP_LABEL_OFFSET;

  const edgePath = isSelfLoop ? selfLoopPath : isCurved ? curvedPath : straightPath;

  const labelX = isSelfLoop
    ? selfLoopLabelX
    : isCurved
    ? midX + normalX * curveSign * CURVE_LABEL_OFFSET
    : straightLabelX;

  const labelY = isSelfLoop
    ? selfLoopLabelY
    : isCurved
    ? midY + normalY * curveSign * CURVE_LABEL_OFFSET
    : straightLabelY;

  /**
   * ¿La constelacion esta encendida? Si hay una seleccion, solo lo estan
   * las aristas que la tocan: el resto se apaga para que se lea la
   * relacion. Sin seleccion, todas encendidas.
   */
  const isPath = data?.isPath ?? false;
  const isLit = isPath ? true : (data?.isLit ?? true);

  const isDirected = markerEnd !== undefined && markerEnd !== null;

  const showPulse = isLit && (isDirected || selected || isPath);

  const haloWidth = isPath ? 15 : selected ? 17 : 11;
  const haloOpacity = isPath ? 0.3 : isLit ? (selected ? 0.26 : 0.13) : 0.045;
  const haloColor = isPath ? PATH_COLOR : BEAM_COLOR;
  const pulseColor = isPath ? '#ffe9b8' : '#d8fffb';

  /* Cada haz viaja a su ritmo y entra en distinta fase, para que el
     campo de pulsos no se lea como un metronomo. */
  const phase = hashEdgePhase(id);
  const beamDuration = 2400 + (phase % 900);
  const beamDelay = -(phase % beamDuration);

  return (
    <>
      {/* Halo del haz: la luz que se derrama sobre el vacio. Es el
          mismo path mas grueso y mas tenue; el hilo de luz va encima. */}
      <path
        className="pointer-events-none"
        d={edgePath}
        fill="none"
        stroke={haloColor}
        strokeWidth={haloWidth}
        strokeOpacity={haloOpacity}
        strokeLinecap="round"
        aria-hidden="true"
      />

      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />

      {/* Punto de luz que viaja del origen al destino. Solo en aristas
          dirigidas o en la seleccionada, y solo con la constelacion
          encendida: un pulso en una arista atenuada no significaria nada. */}
      {showPulse && (
        <circle
          className="beam-pulse"
          r={selected ? 3.1 : 2.5}
          fill={pulseColor}
          aria-hidden="true"
          style={
            {
              offsetPath: `path("${edgePath}")`,
              '--beam-duration': `${beamDuration}ms`,
              '--beam-delay': `${beamDelay}ms`,
            } as React.CSSProperties
          }
        />
      )}

      {label !== undefined && label !== null && (
        <EdgeLabelRenderer>
          <div
            className="
              absolute
              pointer-events-auto
              nodrag
              nopan
              select-none
              rounded-full
              border
              bg-[#060c1c]/95
              px-2
              py-0.5
              text-[11px]
              font-semibold
              tabular-nums
              backdrop-blur-sm
            "
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: isPath ? PATH_COLOR : selected ? BRAND_COLOR : '#c8d6f2',
              borderColor: isPath ? PATH_COLOR : selected ? BRAND_COLOR : 'rgb(148 170 214 / 0.28)',
              boxShadow: isPath
                ? '0 0 16px rgb(255 214 132 / 0.35)'
                : selected
                  ? '0 0 16px rgb(114 230 224 / 0.35)'
                  : '0 6px 16px rgb(0 0 0 / 0.5)',
              zIndex: selected ? 50 : 30,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const MemoizedWeightedStraightEdge = React.memo(
  WeightedStraightEdge,
  areEdgePropsEqual
);

MemoizedWeightedStraightEdge.displayName = 'WeightedStraightEdge';

export default MemoizedWeightedStraightEdge;