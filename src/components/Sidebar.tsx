import React, { useCallback } from 'react';
import { Settings } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { useEdgeDirectionLogic } from '../hooks/useEdgeDirectionLogic';
import { NodePropsForm } from './NodePropsForm';
import { EdgePropsForm } from './EdgePropsForm';
import { EmptyState } from './EmptyState';

export const Sidebar: React.FC = () => {
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