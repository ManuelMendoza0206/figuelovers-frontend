import type { AppNode, AppEdge } from '../store/useGraphStore';
import { getNearestConnectionIndex, getHandleId, NODE_RADIUS } from '../components/CircularNode';

export const NODE_CENTER_OFFSET = NODE_RADIUS;

export const CURVE_CONTROL_POINT_OFFSET = 30;
export const CURVE_LABEL_OFFSET = 30;

export const SELF_LOOP_HANDLE_ANGLE_SPREAD = 0.65;
export const SELF_LOOP_CONTROL_OFFSET = 55;
export const SELF_LOOP_LATERAL_SPREAD = 42;
export const SELF_LOOP_LABEL_OFFSET = 58;

export const getNodeCenter = (node: AppNode) => ({
  x: node.position.x + NODE_CENTER_OFFSET,
  y: node.position.y + NODE_CENTER_OFFSET,
});

export const getOppositeEdge = (edge: AppEdge, edges: AppEdge[]): AppEdge | null => {
  return (
    edges.find(
      (otherEdge) =>
        otherEdge.id !== edge.id &&
        otherEdge.source === edge.target &&
        otherEdge.target === edge.source
    ) ?? null
  );
};

export interface BidirectionalCurveInfo {
  isCurved: boolean;
  normalX: number;
  normalY: number;
  curveSign: number;
}

export const NO_CURVE: BidirectionalCurveInfo = {
  isCurved: false,
  normalX: 0,
  normalY: 0,
  curveSign: 0,
};

export const getBidirectionalCurveInfo = (
  edge: AppEdge,
  edges: AppEdge[],
  nodeMap: Map<string, AppNode>
): BidirectionalCurveInfo => {
  const oppositeEdge = getOppositeEdge(edge, edges);

  if (!oppositeEdge) {
    return NO_CURVE;
  }

  const firstId = edge.source < edge.target ? edge.source : edge.target;
  const secondId = edge.source < edge.target ? edge.target : edge.source;

  const firstNode = nodeMap.get(firstId);
  const secondNode = nodeMap.get(secondId);

  if (!firstNode || !secondNode) {
    return NO_CURVE;
  }

  const firstCenter = getNodeCenter(firstNode);
  const secondCenter = getNodeCenter(secondNode);

  const dx = secondCenter.x - firstCenter.x;
  const dy = secondCenter.y - firstCenter.y;

  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return NO_CURVE;
  }

  const normalX = -dy / length;
  const normalY = dx / length;

  const curveSign = edge.source === firstId ? 1 : -1;

  return {
    isCurved: true,
    normalX,
    normalY,
    curveSign,
  };
};

export interface SelfLoopInfo {
  isSelfLoop: boolean;
  centerX: number;
  centerY: number;
}

export const NO_SELF_LOOP: SelfLoopInfo = {
  isSelfLoop: false,
  centerX: 0,
  centerY: 0,
};

export const getSelfLoopInfo = (edge: AppEdge, nodeMap: Map<string, AppNode>): SelfLoopInfo => {
  if (edge.source !== edge.target) {
    return NO_SELF_LOOP;
  }

  const node = nodeMap.get(edge.source);

  if (!node) {
    return NO_SELF_LOOP;
  }

  const center = getNodeCenter(node);

  return {
    isSelfLoop: true,
    centerX: center.x,
    centerY: center.y,
  };
};

export const getDynamicEdgeHandles = (
  edge: AppEdge,
  nodeMap: Map<string, AppNode>
) => {
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);

  if (!sourceNode || !targetNode) {
    return {
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    };
  }

  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);

  const sourceDx = targetCenter.x - sourceCenter.x;
  const sourceDy = targetCenter.y - sourceCenter.y;

  const sourceAngle = Math.atan2(sourceDy, sourceDx);

  const targetDx = sourceCenter.x - targetCenter.x;
  const targetDy = sourceCenter.y - targetCenter.y;

  const targetAngle = Math.atan2(targetDy, targetDx);

  const sourceIndex = getNearestConnectionIndex(sourceAngle);
  const targetIndex = getNearestConnectionIndex(targetAngle);

  return {
    sourceHandle: getHandleId('source', sourceIndex),
    targetHandle: getHandleId('target', targetIndex),
  };
};

export const getSelfLoopHandles = () => {
  const baseAngle = -Math.PI / 2;

  const sourceAngle = baseAngle - SELF_LOOP_HANDLE_ANGLE_SPREAD;
  const targetAngle = baseAngle + SELF_LOOP_HANDLE_ANGLE_SPREAD;

  const sourceIndex = getNearestConnectionIndex(sourceAngle);
  const targetIndex = getNearestConnectionIndex(targetAngle);

  return {
    sourceHandle: getHandleId('source', sourceIndex),
    targetHandle: getHandleId('target', targetIndex),
  };
};