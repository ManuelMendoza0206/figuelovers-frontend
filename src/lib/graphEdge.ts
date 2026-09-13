import { MarkerType } from 'reactflow';
import type { CSSProperties } from 'react';

export const BRAND_COLOR = '#05A8AA';
export const INK_COLOR = '#242F40';

export const EDGE_STROKE_WIDTH = 2.5;
export const EDGE_Z_INDEX = 10;

export const createEdgeMarker = (): { type: MarkerType } => ({
  type: MarkerType.ArrowClosed,
});

export const createEdgeStyle = (
  overrides: CSSProperties = {}
): CSSProperties => ({
  stroke: BRAND_COLOR,
  strokeWidth: EDGE_STROKE_WIDTH,
  zIndex: EDGE_Z_INDEX,
  ...overrides,
});