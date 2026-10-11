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

/**
 * Fase del centelleo, derivada del id del nodo.
 *
 * Si todas las estrellas pulsaran a la vez el campo se leeria como un
 * GIF, no como un cielo. Sin estado ni aleatoriedad en render: la misma
 * estrella centellea siempre en la misma fase.
 */
export const starTwinklePhase = (id: string): number => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }

  return Math.round((hash / 997) * 6000);
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
      className="relative flex h-[76px] w-[76px] items-center justify-center select-none"
      aria-label={`Nodo ${data.label}`}
      data-node-id={id}
    >
      {/* Halo: la luz que la estrella derrama sobre el vacio. */}
      <span
        aria-hidden="true"
        className={[
          'star-halo pointer-events-none absolute inset-0 rounded-full',
          'transition-opacity duration-300',
          selected ? 'opacity-100' : 'opacity-80',
        ].join(' ')}
      />

      {/* Nucleo. No lleva transicion: su animacion escribe
          transform/opacidad y las dos se pelearian con la seleccion. */}
      <span
        aria-hidden="true"
        className="star-core pointer-events-none absolute inset-0 rounded-full"
        style={{ animationDelay: `${starTwinklePhase(id)}ms` }}
      />

      {selected && (
        <span
          aria-hidden="true"
          className="star-ring pointer-events-none absolute -inset-[10px] rounded-full"
        />
      )}

      {/* La etiqueta sale de la caja de 76px en posicion absoluta: ni el
          ancho ni los porcentajes de los handles se ven afectados. */}
      <span
        className="star-label pointer-events-none absolute left-1/2 top-full mt-1.5 w-max max-w-[104px] -translate-x-1/2 truncate text-center text-[11px] font-bold tracking-[0.01em] text-ink/90"
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

/**
 * ReactFlow re-renderiza el grafo completo ante cualquier cambio. Sin
 * memo, mover un nodo repinta los otros N-1 nodos y sus 48 handles.
 *
 * El shallow compare por defecto alcanza: ReactFlow pasa props
 * escalares (`id`, `selected`) y `data` mantiene identidad estable
 * durante un drag porque `applyNodeChanges` no toca `data`.
 */
const MemoizedCircularNode = React.memo(CircularNode);

MemoizedCircularNode.displayName = 'CircularNode';

export default MemoizedCircularNode;
export { CircularNode };
