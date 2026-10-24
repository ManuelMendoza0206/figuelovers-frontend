import React, { useMemo } from 'react';

/**
 * Grafo de solo lectura en SVG para las pantallas de algoritmos.
 *
 * Dibuja el grafo del editor SIN tocar el lienzo: mismas posiciones,
 * pesos y flechas, pero sin interacción (no se mueve ni se edita nada).
 * Elegimos SVG sobre React Flow readonly porque estas páginas solo
 * necesitan resaltar nodos/aristas por estado, y un SVG liviano no
 * arrastra reactflow ni exige nodeTypes/edgeTypes (evitamos de paso las
 * advertencias de tipos que eso trae).
 *
 * Los estilos llegan como CLASSES Tailwind literales desde la página
 * (nunca se concatenan strings dinámicos, o Tailwind no las genera).
 * El componente vive a nivel de módulo, fuera de cualquier página.
 */

export interface SketchNodeInput {
  id: string;
  label: string;
  position: { x: number; y: number } | null;
}

export interface SketchEdgeInput {
  id: string;
  source: string;
  target: string;
  weight?: number | null;
  isDirected: boolean;
}

export interface SketchNodeStyle {
  /** Clase de relleno del círculo, p. ej. 'fill-brand'. */
  fillClass: string;
  /** Clase de trazo del anillo, p. ej. 'stroke-amber-200'. */
  ringClass?: string;
}

export interface SketchEdgeStyle {
  /** Clase de color de la línea, p. ej. 'stroke-brand'. */
  strokeClass: string;
  width?: number;
  dashed?: boolean;
}

interface GraphSketchProps {
  nodes: SketchNodeInput[];
  edges: SketchEdgeInput[];
  /** Estado de cada nodo en el paso actual (por id). */
  nodeStyle?: (nodeId: string) => SketchNodeStyle;
  /** Estado de cada arista en el paso actual (por id). */
  edgeStyle?: (edgeId: string) => SketchEdgeStyle;
  /** Texto auxiliar bajo el nodo, p. ej. la distancia tentativa. */
  nodeBadge?: (nodeId: string) => string | null;
  ariaLabel?: string;
  className?: string;
}

/** Respiro alrededor de la figura para que no toque el marco. */
const PADDING = 60;

/** Grilla de respaldo si un nodo viniera sin posición. */
const fallbackPosition = (index: number): { x: number; y: number } => ({
  x: 100 + (index % 5) * 150,
  y: 100 + Math.floor(index / 5) * 150,
});

const DEFAULT_NODE_STYLE: SketchNodeStyle = { fillClass: 'fill-slate-500' };
const DEFAULT_EDGE_STYLE: SketchEdgeStyle = { strokeClass: 'stroke-white/25', width: 1.5 };

export const GraphSketch: React.FC<GraphSketchProps> = ({
  nodes,
  edges,
  nodeStyle,
  edgeStyle,
  nodeBadge,
  ariaLabel,
  className,
}) => {
  const layout = useMemo(() => {
    const positioned = nodes.map((node, index) => ({
      ...node,
      resolved: node.position ?? fallbackPosition(index),
    }));

    if (positioned.length === 0) return null;

    const xs = positioned.map((node) => node.resolved.x);
    const ys = positioned.map((node) => node.resolved.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    // El radio se fija contra la dimensión chica, como en la vista
    // previa de constelaciones: una figura aplastada no debe producir
    // círculos gigantes.
    const radius = Math.max(Math.min(width, height) * 0.055, 11);

    return {
      positioned,
      viewBox: `${minX - PADDING} ${minY - PADDING} ${width + PADDING * 2} ${height + PADDING * 2}`,
      radius,
      fontSize: Math.max(radius * 0.85, 10),
    };
  }, [nodes]);

  if (!layout) {
    return (
      <div className={`flex items-center justify-center text-xs text-ink-subtle ${className ?? ''}`}>
        sin grafo que dibujar
      </div>
    );
  }

  const positionOf = new Map(
    layout.positioned.map((node) => [node.id, node.resolved])
  );

  return (
    <svg
      viewBox={layout.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Vista de solo lectura del grafo'}
    >
      {edges.map((edge) => {
        const source = positionOf.get(edge.source);
        const target = positionOf.get(edge.target);
        if (!source || !target) return null;

        const style = edgeStyle?.(edge.id) ?? DEFAULT_EDGE_STYLE;
        const weight = edge.weight ?? 1.0;

        // Bucle (nodo a sí mismo): arco chico por encima del nodo.
        if (edge.source === edge.target) {
          const loopRadius = layout.radius * 1.6;
          return (
            <path
              key={edge.id}
              d={`M ${source.x - loopRadius} ${source.y - layout.radius * 0.2}
                  C ${source.x - loopRadius} ${source.y - loopRadius * 3},
                    ${source.x + loopRadius} ${source.y - loopRadius * 3},
                    ${source.x + loopRadius} ${source.y - layout.radius * 0.2}`}
              fill="none"
              strokeWidth={style.width ?? 1.5}
              strokeDasharray={style.dashed ? '5 4' : undefined}
              className={style.strokeClass}
            />
          );
        }

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;

        // La línea arranca y termina en el borde de los círculos.
        const startX = source.x + ux * layout.radius;
        const startY = source.y + uy * layout.radius;
        const endX = target.x - ux * layout.radius;
        const endY = target.y - uy * layout.radius;

        // Punta de flecha (triángulo calculado a mano, sin markers):
        // así el color de la flecha sigue al color de la línea.
        const arrowLength = layout.radius * 0.7;
        const arrowWidth = layout.radius * 0.42;
        const tipX = endX;
        const tipY = endY;
        const baseX = tipX - ux * arrowLength;
        const baseY = tipY - uy * arrowLength;
        const perpendicularX = -uy;
        const perpendicularY = ux;

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        return (
          <g key={edge.id}>
            <line
              x1={startX}
              y1={startY}
              x2={edge.isDirected ? baseX : endX}
              y2={edge.isDirected ? baseY : endY}
              strokeWidth={style.width ?? 1.5}
              strokeDasharray={style.dashed ? '5 4' : undefined}
              className={style.strokeClass}
            />
            {edge.isDirected && (
              <polygon
                points={`${tipX},${tipY} ${baseX + perpendicularX * arrowWidth / 2},${baseY + perpendicularY * arrowWidth / 2} ${baseX - perpendicularX * arrowWidth / 2},${baseY - perpendicularY * arrowWidth / 2}`}
                className={style.strokeClass}
              />
            )}
            <text
              x={midX + perpendicularX * layout.fontSize * 0.8}
              y={midY + perpendicularY * layout.fontSize * 0.8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={layout.fontSize * 0.72}
              className="fill-ink-subtle font-mono"
            >
              {weight}
            </text>
          </g>
        );
      })}

      {layout.positioned.map((node) => {
        const style = nodeStyle?.(node.id) ?? DEFAULT_NODE_STYLE;
        const badge = nodeBadge?.(node.id) ?? null;

        return (
          <g key={node.id}>
            {style.ringClass && (
              <circle
                cx={node.resolved.x}
                cy={node.resolved.y}
                r={layout.radius * 1.45}
                fill="none"
                strokeWidth={layout.radius * 0.18}
                className={style.ringClass}
              />
            )}
            <circle
              cx={node.resolved.x}
              cy={node.resolved.y}
              r={layout.radius}
              className={style.fillClass}
            />
            <text
              x={node.resolved.x}
              y={node.resolved.y + layout.radius + layout.fontSize * 0.95}
              textAnchor="middle"
              fontSize={layout.fontSize * 0.8}
              className="fill-ink font-semibold"
            >
              {node.label}
            </text>
            {badge && (
              <text
                x={node.resolved.x}
                y={node.resolved.y + layout.radius + layout.fontSize * 2.05}
                textAnchor="middle"
                fontSize={layout.fontSize * 0.75}
                className="fill-ink-subtle font-mono"
              >
                {badge}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
