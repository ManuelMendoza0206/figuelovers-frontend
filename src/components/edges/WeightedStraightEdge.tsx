import { BaseEdge, EdgeLabelRenderer, getStraightPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

import {
  CURVE_CONTROL_POINT_OFFSET,
  CURVE_LABEL_OFFSET,
  SELF_LOOP_CONTROL_OFFSET,
  SELF_LOOP_LATERAL_SPREAD,
  SELF_LOOP_LABEL_OFFSET,
} from '../../lib/graphGeometry';

interface WeightedEdgeData {
  isCurved?: boolean;
  normalX?: number;
  normalY?: number;
  curveSign?: number;
  isSelfLoop?: boolean;
  loopCenterX?: number;
  loopCenterY?: number;
}

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

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />

      {label !== undefined && label !== null && (
        <EdgeLabelRenderer>
          <div
            className="
              absolute
              pointer-events-auto
              nodrag
              nopan
              select-none
              rounded-md
              border
              bg-white
              px-2
              py-0.5
              text-xs
              font-semibold
              shadow-sm
            "
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: selected ? '#05A8AA' : '#242F40',
              borderColor: selected ? '#05A8AA' : '#cbd5e1',
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