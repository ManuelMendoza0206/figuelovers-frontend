/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Handle, Position } from 'reactflow';

import type { NodeProps } from 'reactflow';

import type { AppNodeData } from '../types/graph';

export const NODE_SIZE = 76;

export const CONNECTION_POINTS = 24;

export const NODE_RADIUS = NODE_SIZE / 2;

export const getConnectionAngle = (
  index: number
): number => {
  return (
    (index / CONNECTION_POINTS) * Math.PI * 2 -
    Math.PI / 2
  );
};

export const getConnectionPoint = (
  index: number
) => {
  const angle =
    getConnectionAngle(index);

  return {
    x:
      NODE_RADIUS +
      Math.cos(angle) *
        NODE_RADIUS,

    y:
      NODE_RADIUS +
      Math.sin(angle) *
        NODE_RADIUS,
  };
};

export const getConnectionStyle = (
  index: number
) => {
  const point =
    getConnectionPoint(index);

  return {
    left: `${(point.x / NODE_SIZE) * 100}%`,
    top: `${(point.y / NODE_SIZE) * 100}%`,
    transform:
      'translate(-50%, -50%)',
  };
};

export const getNearestConnectionIndex = (
  angle: number
): number => {
  const normalizedAngle =
    ((angle + Math.PI * 2) %
      (Math.PI * 2));

  const startAngle =
    ((-Math.PI / 2) +
      Math.PI * 2) %
    (Math.PI * 2);

  const relativeAngle =
    (normalizedAngle -
      startAngle +
      Math.PI * 2) %
    (Math.PI * 2);

  const step =
    (Math.PI * 2) /
    CONNECTION_POINTS;

  return (
    Math.round(relativeAngle / step) %
    CONNECTION_POINTS
  );
};

export const getHandleId = (
  type: 'source' | 'target',
  index: number
): string => {
  return `${type}-${index}`;
};

const CircularNode: React.FC<
  NodeProps<AppNodeData>
> = ({
  id,
  data,
  selected,
}) => {
  return (
    <div
      className={[
        'relative flex h-[76px] w-[76px] items-center justify-center',
        'rounded-full border-2 bg-white',
        'transition-all duration-150',
        'select-none',

        selected
          ? 'border-brand shadow-[0_0_0_5px_rgba(5,168,170,0.14),0_8px_22px_rgba(36,47,64,0.15)]'
          : 'border-ink shadow-[0_5px_16px_rgba(36,47,64,0.12)]',
      ].join(' ')}
      aria-label={`Nodo ${data.label}`}
      data-node-id={id}
    >

      <span
        className="pointer-events-none max-w-[60px] truncate px-1 text-center text-xs font-extrabold leading-tight text-ink"
        title={data.label}
      >
        {data.label}
      </span>

      {Array.from({
        length: CONNECTION_POINTS,
      }).map((_, index) => {
        const style =
          getConnectionStyle(index);

        return (
          <React.Fragment
            key={`connection-point-${index}`}
          >

            <Handle
              id={getHandleId(
                'target',
                index
              )}
              type="target"
              position={Position.Top}
              className="!m-0 !h-3 !w-3 !rounded-full !border-0 !bg-transparent"
              style={{
                ...style,

                // Invisible visualmente,
                // pero sigue siendo interactivo.
                opacity: 0,

                // Permite iniciar/interactuar
                // con la zona del Handle.
                pointerEvents: 'auto',

                // Mantiene los Handles por encima
                // del contenido del nodo.
                zIndex: 30,
              }}
            />

            <Handle
              id={getHandleId(
                'source',
                index
              )}
              type="source"
              position={Position.Top}
              className="!m-0 !h-3 !w-3 !rounded-full !border-0 !bg-transparent"
              style={{
                ...style,
                opacity: 0,
                pointerEvents: 'auto',
                zIndex: 30,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default CircularNode;
export { CircularNode };