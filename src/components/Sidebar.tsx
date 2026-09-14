import React, { useCallback } from 'react';
import { BriefcaseBusiness, GitBranch, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGraphStore } from '../store/useGraphStore';
import { useEdgeDirectionLogic } from '../hooks/useEdgeDirectionLogic';
import { NodePropsForm } from './NodePropsForm';
import { EdgePropsForm } from './EdgePropsForm';
import { EmptyState } from './EmptyState';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSaveNode = useCallback(
    (label: string) => {
      if (!selectedNode) return;
      updateNodeData(selectedNode.id, label);
    },
    [selectedNode, updateNodeData]
  );

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    const confirmed = window.confirm(
      `¿Eliminar el nodo "${selectedNode.data?.label || 'sin nombre'}"?\n\nTambién se eliminarán todas las aristas conectadas a este nodo.`
    );
    if (!confirmed) return;
    deleteNode(selectedNode.id);
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
    const confirmed = window.confirm('¿Eliminar esta arista del grafo?');
    if (!confirmed) return;
    deleteEdge(selectedEdge.id);
  }, [selectedEdge, deleteEdge]);

  const handleReverseEdge = useCallback(() => {
    if (!selectedEdge) return;
    reverseEdge(selectedEdge.id);
  }, [selectedEdge, reverseEdge]);

  return (
    <aside className="z-20 flex w-full shrink-0 flex-col border-slate-200 bg-white shadow-[-8px_0_30px_rgba(36,47,64,0.06)] md:h-full md:w-80 md:border-l">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <Settings className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold tracking-tight text-ink">Propiedades</h2>
            <p className="mt-0.5 text-xs text-slate-400">Edita el elemento seleccionado</p>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5">
        <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Algoritmos</p>
              <h3 className="text-sm font-bold text-ink">Herramientas</h3>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Johnson', to: '/johnson' },
              { label: 'Asignación', to: '/assignment' },
            ].map(({ label, to }) => {
              const isActive = location.pathname === to;

              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => navigate(to)}
                  className={[
                    'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand/40 hover:bg-brand-muted/30',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Abrir</span>
                </button>
              );
            })}
          </div>
        </section>

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
  );
};