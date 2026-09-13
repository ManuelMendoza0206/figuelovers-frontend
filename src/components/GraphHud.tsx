import React from 'react';
import { Maximize2 } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import type { GraphTool } from '../types/graph';

interface GraphHudProps {
  activeTool: GraphTool;
  onFitView: () => void;
}

export const GraphHud: React.FC<GraphHudProps> = ({ activeTool, onFitView }) => {
  const { nodes, edges } = useGraphStore();

  return (
    <>
      <span className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-border bg-surface/95 px-3.5 py-2 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-brand" />

          {activeTool === 'interact' && (
            <span>
              <strong className="font-bold text-ink">Interactuar</strong> · mueve, selecciona y edita
            </span>
          )}

          {activeTool === 'connect' && (
            <span>
              <strong className="font-bold text-ink">Conectar</strong> · arrastra de un nodo a otro
            </span>
          )}
        </div>
      </span>

      <button
        type="button"
        onClick={onFitView}
        title="Centrar el grafo"
        aria-label="Centrar grafo"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-slate-500 shadow-lg transition hover:border-brand/40 hover:bg-brand-muted hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-border bg-surface/95 px-3.5 py-2 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span>
            <strong className="font-bold text-ink">{nodes.length}</strong> {nodes.length === 1 ? 'nodo' : 'nodos'}
          </span>
          <span className="h-3 w-px bg-border" />
          <span>
            <strong className="font-bold text-ink">{edges.length}</strong> {edges.length === 1 ? 'arista' : 'aristas'}
          </span>
        </div>
      </div>
    </>
  );
};