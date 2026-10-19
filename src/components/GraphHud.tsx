import { Maximize2 } from 'lucide-react';
import React from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { GraphTool } from '../types/graph';

interface GraphHudProps {
  activeTool: GraphTool;
  onFitView: () => void;
  /** Forma protegida (constelación): el modo activo no es "arrastrar". */
  locked?: boolean;
}

/** Que esta esperando el usuario en el modo activo. El cursor ya dice el
 *  "como" (+, ×, manito); esto dice el "que pasa si hago clic". */
const TOOL_HINTS: Record<GraphTool, React.ReactNode> = {
  interact: (
    <span>
      <strong className="font-bold text-ink">Interactuar</strong> · mueve, selecciona y edita
    </span>
  ),
  connect: (
    <span>
      <strong className="font-bold text-ink">Conectar</strong> · arrastra de un nodo a otro
    </span>
  ),
  add: (
    <span>
      <strong className="font-bold text-ink">Añadir</strong> · clic en el lienzo para crear una estrella
    </span>
  ),
  delete: (
    <span>
      <strong className="font-bold text-ink">Eliminar</strong> · clic en una estrella o conexión
    </span>
  ),
};

/**
 * Con la forma protegida el modo activo termina siendo siempre
 * "interactuar", pero ese modo ya no incluye arrastrar: dejar el hint
 * de "mueve" seria mentirle al usuario.
 */
const LOCKED_HINT = (
  <span>
    <strong className="font-bold text-ink">Constelación protegida</strong> · la forma es fija;
    renombra estrellas y edita pesos
  </span>
);

export const GraphHud: React.FC<GraphHudProps> = ({
  activeTool,
  onFitView,
  locked = false,
}) => {
  const { nodes, edges } = useGraphStore();

  return (
    <>
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-[#070d1d]/80 px-4 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>

          {locked ? LOCKED_HINT : TOOL_HINTS[activeTool]}
        </div>
      </div>

      <button
        type="button"
        onClick={onFitView}
        title="Centrar el grafo"
        aria-label="Centrar grafo"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#070d1d]/80 text-ink-muted shadow-2xl backdrop-blur-md transition duration-150 hover:border-brand/40 hover:bg-brand/10 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full border border-white/10 bg-[#070d1d]/80 px-4 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 text-[11px] font-medium tabular-nums text-ink-muted">
          <span>
            <strong className="font-bold text-ink">{nodes.length}</strong> {nodes.length === 1 ? 'nodo' : 'nodos'}
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span>
            <strong className="font-bold text-ink">{edges.length}</strong> {edges.length === 1 ? 'arista' : 'aristas'}
          </span>
        </div>
      </div>
    </>
  );
};
