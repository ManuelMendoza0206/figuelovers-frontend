import { ChevronDown, Crosshair, Route, Settings, Truck, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEdgeDirectionLogic } from '../hooks/useEdgeDirectionLogic';
import { useGraphStore } from '../store/useGraphStore';
import type { GraphAssignmentTransfer } from '../utils/graphToMatrix';
import { translateGraphToCostMatrix } from '../utils/graphToMatrix';
import { ConfirmDialog } from './ConfirmDialog';
import { EdgePropsForm } from './EdgePropsForm';
import { EmptyState } from './EmptyState';
import { NodePropsForm } from './NodePropsForm';

export interface SidebarWorkbench {
  /** Título del panel de trabajo; reemplaza a "Propiedades". */
  title: string;
  /** Línea de apoyo debajo del título. */
  subtitle?: string;
  /** Ícono del encabezado; por defecto, el engranaje de propiedades. */
  icon?: LucideIcon;
  /** Tratamiento del recuadro del ícono, para teñirlo según la página. */
  iconClassName?: string;
}

interface SidebarProps {
  /**
   * Variante de trabajo: el sidebar se expande (~460px en desktop, con
   * animación al entrar) y el cuerpo muestra `children` en lugar de las
   * propiedades de la selección. El mecanismo es general; hoy solo lo
   * activa la página de árboles.
   */
  workbench?: SidebarWorkbench;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ workbench, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const HeaderIcon = workbench?.icon ?? Settings;
  const headerTone = workbench?.iconClassName ?? 'bg-brand-muted text-brand';

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

  /**
   * Comando de misión = Algoritmo Húngaro. Es UNA sola pantalla.
   *
   * Si la constelación actual se puede traducir a una matriz, se lleva
   * esa matriz; si no (pocos nodos, sin conexiones, demasiados), abre
   * la pantalla con una matriz vacía para que la cargues a mano.
   *
   * Antes esto eran dos botones distintos que iban a la misma ruta, lo
   * que hacía pensar que eran dos algoritmos distintos.
   */
  const openAssignment = useCallback(() => {
    const transfer: GraphAssignmentTransfer = {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.data?.label ?? '',
      })),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.data?.weight ?? 1,
        isDirected: edge.data?.is_directed === true,
      })),
    };

    const probe = translateGraphToCostMatrix(
      transfer.nodes,
      transfer.edges,
      'minimize'
    );

    if (probe.ok) {
      navigate(
        `/assignment?from=${encodeURIComponent(returnTo)}&origin=board`,
        { state: { graphTransfer: transfer } }
      );
    } else {
      navigate(`/assignment?from=${encodeURIComponent(returnTo)}`);
    }

    setIsToolsOpen(false);
  }, [nodes, edges, navigate, returnTo]);

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
  }, [selectedNode]);

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
  }, [selectedEdge]);

  const handleReverseEdge = useCallback(() => {
    if (!selectedEdge) return;
    reverseEdge(selectedEdge.id);
  }, [selectedEdge, reverseEdge]);

  return (
    <>
    <aside className={`z-20 flex w-full shrink-0 flex-col border-white/10 bg-[#0d1832] shadow-[-8px_0_30px_rgba(0,0,0,0.25)] md:h-full md:border-l ${workbench ? 'sidebar-expand md:w-[460px]' : 'md:w-80'}`}>
      <div
        className="relative shrink-0 border-b border-white/10 bg-[#101b37] px-4 py-3 md:px-5 md:py-4"
        onMouseEnter={() => setIsToolsOpen(true)}
        onMouseLeave={() => setIsToolsOpen(false)}
      >
        <div className="pointer-events-none absolute -left-2 top-0 h-full w-2" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${headerTone}`}>
            <HeaderIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold tracking-tight text-ink">{workbench?.title ?? 'Propiedades'}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{workbench?.subtitle ?? 'Edita el elemento seleccionado'}</p>
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
            <p className="eyebrow mb-2 text-[9px]">Algoritmos</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => openAlgorithm('/johnson')} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${location.pathname === '/johnson' ? 'border-brand/40 bg-brand/10 text-brand' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-brand/25 hover:text-ink'}`}>
                <Route className="h-4 w-4" />
                <span>JOHNSON</span>
              </button>
              <button
                type="button"
                onClick={openAssignment}
                className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${location.pathname === '/assignment' ? 'border-[#ffd684]/40 bg-[#ffd684]/10 text-[#ffd684]' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-[#ffd684]/25 hover:text-ink'}`}
              >
                <Crosshair className="h-4 w-4" />
                <span>ASIGNACION</span>
              </button>
              <button
                type="button"
                onClick={() => openAlgorithm('/trees')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${location.pathname === '/trees' ? 'border-violet-300/40 bg-violet-300/10 text-violet-200' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-violet-300/25 hover:text-ink'}`}
              >
                <GitBranch className="h-4 w-4" />
                <span>ARBOLES</span>
              </button>
              <button
                type="button"
                onClick={() => openAlgorithm('/northwest')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${location.pathname === '/northwest' ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-emerald-300/25 hover:text-ink'}`}
              >
                <Truck className="h-4 w-4" />
                <span>NORTHWEST</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5">
        {workbench ? children : (
          <>
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
          </>
        )}
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