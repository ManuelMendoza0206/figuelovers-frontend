import { ChevronDown, Crosshair, Route, Settings } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEdgeDirectionLogic } from '../hooks/useEdgeDirectionLogic';
import { useGraphStore } from '../store/useGraphStore';
import { ConfirmDialog } from './ConfirmDialog';
import { EdgePropsForm } from './EdgePropsForm';
import { EmptyState } from './EmptyState';
import { NodePropsForm } from './NodePropsForm';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    updateNodeData,
    updateEdgeData,
    deleteNode,
    deleteEdge,
    reverseEdge,
  } = useGraphStore();

  const {
    existingDirectedEdge,
    shouldReverseToRespectExisting,
  } = useEdgeDirectionLogic(selectedEdge, nodes, edges);
  const [confirmAction, setConfirmAction] = useState<'node' | 'edge' | null>(null);

  const returnTo = location.pathname.startsWith('/galaxy/') || location.pathname === '/editor'
    ? location.pathname
    : '/editor';

  const openAlgorithm = (path: string) => {
    navigate(`${path}?from=${encodeURIComponent(returnTo)}`);
    setIsToolsOpen(false);
  };

  const handleSaveNode = useCallback(
    (label: string) => {
      if (!selectedNode) return;
      updateNodeData(selectedNode.id, label);
    },
    [selectedNode, updateNodeData]
  );

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    setConfirmAction('node');
  }, [selectedNode, deleteNode]);

  const handleSaveEdge = useCallback(
    (weight: number, isDirected: boolean) => {
      if (!selectedEdge) return;
      if (!Number.isFinite(weight)) return;

      if (!isDirected) {
        updateEdgeData(selectedEdge.id, weight, false);
        return;
      }

      if (existingDirectedEdge && shouldReverseToRespectExisting) {
        reverseEdge(selectedEdge.id);
      }
      updateEdgeData(selectedEdge.id, weight, true);
    },
    [selectedEdge, existingDirectedEdge, shouldReverseToRespectExisting, updateEdgeData, reverseEdge]
  );

  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdge) return;
    setConfirmAction('edge');
  }, [selectedEdge, deleteEdge]);

  const handleReverseEdge = useCallback(() => {
    if (!selectedEdge) return;
    reverseEdge(selectedEdge.id);
  }, [selectedEdge, reverseEdge]);

  return (
    <>
    <aside className="z-20 flex w-full shrink-0 flex-col border-white/10 bg-[#0d1832] shadow-[-8px_0_30px_rgba(0,0,0,0.25)] md:h-full md:w-80 md:border-l">
      <div
        className="relative shrink-0 border-b border-white/10 bg-[#101b37] px-4 py-3 md:px-5 md:py-4"
        onMouseEnter={() => setIsToolsOpen(true)}
        onMouseLeave={() => setIsToolsOpen(false)}
      >
        <div className="pointer-events-none absolute -left-2 top-0 h-full w-2" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <Settings className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold tracking-tight text-ink">Propiedades</h2>
            <p className="mt-0.5 text-xs text-slate-400">Edita el elemento seleccionado</p>
          </div>
          <button
            type="button"
            onFocus={() => setIsToolsOpen(true)}
            onClick={() => setIsToolsOpen((current) => !current)}
            aria-label="Mostrar herramientas de algoritmos"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand transition hover:bg-brand/10"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ${isToolsOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
          <div className="min-h-0 overflow-hidden">
            <p className="eyebrow mb-2 text-[9px]">Herramientas de navegación</p>
            <div className="space-y-2">
              <button type="button" onClick={() => openAlgorithm('/johnson')} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${location.pathname === '/johnson' ? 'border-brand/40 bg-brand/10 text-brand' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-brand/25 hover:text-ink'}`}>
                <Route className="h-4 w-4" />
                <span><strong className="block text-xs">Rutas interestelares</strong><span className="font-mono text-[10px] opacity-70">(Johnson)</span></span>
              </button>
              <button type="button" onClick={() => openAlgorithm('/assignment')} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${location.pathname === '/assignment' ? 'border-[#ffd684]/40 bg-[#ffd684]/10 text-[#ffd684]' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-[#ffd684]/25 hover:text-ink'}`}>
                <Crosshair className="h-4 w-4" />
                <span><strong className="block text-xs">Comando de misión</strong><span className="font-mono text-[10px] opacity-70">(Húngaro)</span></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5">
        {selectedNode && (
          <NodePropsForm
            key={`node-${selectedNode.id}`}
            node={selectedNode}
            onSave={handleSaveNode}
            onDelete={handleDeleteNode}
          />
        )}

        {selectedEdge && !selectedNode && (
          <EdgePropsForm
            key={`edge-${selectedEdge.id}`}
            edge={selectedEdge}
            nodes={nodes}
            edges={edges}
            onSave={handleSaveEdge}
            onDelete={handleDeleteEdge}
            onReverse={handleReverseEdge}
          />
        )}

        {!selectedNode && !selectedEdge && <EmptyState />}
      </div>
    </aside>
    <ConfirmDialog
      isOpen={confirmAction !== null}
      title={confirmAction === 'node' ? '¿Eliminar esta estrella?' : '¿Eliminar esta conexión?'}
      message={confirmAction === 'node' ? 'También desaparecerán las líneas conectadas a esta estrella.' : 'La conexión se retirará de la constelación.'}
      confirmLabel="Eliminar"
      onCancel={() => setConfirmAction(null)}
      onConfirm={() => {
        if (confirmAction === 'node' && selectedNode) deleteNode(selectedNode.id);
        if (confirmAction === 'edge' && selectedEdge) deleteEdge(selectedEdge.id);
        setConfirmAction(null);
      }}
    />
    </>
  );
};