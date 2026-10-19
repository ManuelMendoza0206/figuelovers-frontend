import React, { useMemo } from 'react';

import type { GraphFileSchema } from '../types/graph';

interface ConstellationPreviewProps {
  graph: GraphFileSchema;
  className?: string;
}

/** Respiro alrededor de la figura para que no toque el borde del marco. */
const PADDING = 48;

/**
 * Vista previa de una constelación dibujada en SVG con sus propias
 * posiciones y aristas.
 *
 * No hay imágenes: el JSON que dibuja es el mismo que después se abre en
 * el lienzo, así que lo que ves en la tarjeta es exactamente lo que vas a
 * encontrar en el editor. Las coordenadas se escalan al marco con
 * `viewBox` + `preserveAspectRatio`, así que sirve igual para Orión
 * (apretado y alto) que para Casiopea (largo y plano).
 */
export const ConstellationPreview: React.FC<ConstellationPreviewProps> = ({
  graph,
  className,
}) => {
  const layout = useMemo(() => {
    const nodes = graph.graph.nodes;

    const positions = nodes
      .map((node) => node.position)
      .filter((position): position is { x: number; y: number } =>
        Boolean(position && typeof position.x === 'number' && typeof position.y === 'number')
      );

    if (positions.length === 0) return null;

    const minX = Math.min(...positions.map((position) => position.x));
    const maxX = Math.max(...positions.map((position) => position.x));
    const minY = Math.min(...positions.map((position) => position.y));
    const maxY = Math.max(...positions.map((position) => position.y));

    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    // Sin esto, una constelación perfectamente horizontal (Casiopea casi)
    // tendría circulos gigantes: el radio se fija contra la dimensión
    // chica del dibujo.
    const radius = Math.max(Math.min(width, height) * 0.045, 5);

    return {
      viewBox: `${minX - PADDING} ${minY - PADDING} ${width + PADDING * 2} ${height + PADDING * 2}`,
      radius,
    };
  }, [graph]);

  if (!layout) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-ink-subtle ${className ?? ''}`}
      >
        sin vista previa
      </div>
    );
  }

  return (
    <svg
      viewBox={layout.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-hidden="true"
    >
      {graph.graph.edges.map((edge) => {
        const source = graph.graph.nodes.find((node) => node.id === edge.source);
        const target = graph.graph.nodes.find((node) => node.id === edge.target);

        if (!source?.position || !target?.position) return null;

        return (
          <line
            key={edge.id}
            x1={source.position.x}
            y1={source.position.y}
            x2={target.position.x}
            y2={target.position.y}
            className="stroke-brand/50"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {graph.graph.nodes.map((node) =>
        node.position ? (
          <g key={node.id}>
            {/* Halo: le da la lectura de "estrella" sin sumar ruido. */}
            <circle
              cx={node.position.x}
              cy={node.position.y}
              r={layout.radius * 2.6}
              className="fill-brand/10"
            />
            <circle
              cx={node.position.x}
              cy={node.position.y}
              r={layout.radius}
              className="fill-brand"
            />
          </g>
        ) : null
      )}
    </svg>
  );
};

export default ConstellationPreview;
