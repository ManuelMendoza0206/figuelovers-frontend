import React from 'react';
import { List } from 'lucide-react';
import { Modal } from '../ui';
import type { AdjacencyListItem } from '../types/graph';
import { truncateId } from '../lib/truncate';

interface AdjListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, AdjacencyListItem[]> | null;
  folioByNodeId: Record<string, number>;
}

export const AdjListModal: React.FC<AdjListModalProps> = ({
  isOpen,
  onClose,
  data,
  folioByNodeId,
}) => {
  if (!isOpen || !data) {
    return null;
  }

  const nodeKeys = Object.keys(data);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lista de adyacencia"
      subtitle="Conexiones de cada nodo del grafo"
      icon={<List className="h-5 w-5" />}
      maxWidth="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            {nodeKeys.length} {nodeKeys.length === 1 ? 'nodo' : 'nodos'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {nodeKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-slate-300 shadow-sm">
            <List className="h-7 w-7" />
          </div>

          <p className="font-semibold text-ink">El grafo no contiene datos</p>

          <p className="mt-1 text-sm text-slate-500">
            No existen nodos o conexiones para mostrar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nodeKeys.map((node) => {
            const connections = data[node] ?? [];
            const nodeFolio = folioByNodeId[node];

            return (
              <div
                key={node}
                className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/30 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div
                    className="flex shrink-0 items-center gap-3 sm:w-64"
                    title={node}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand/30 bg-brand-muted text-brand">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="8"
                          strokeWidth={1.8}
                        />
                      </svg>
                    </span>

                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Origen
                        {nodeFolio !== undefined && (
                          <span className="ml-1.5 normal-case text-brand">
                            #{nodeFolio}
                          </span>
                        )}
                      </span>

                      <span className="block truncate font-mono text-sm font-bold text-ink">
                        {truncateId(node)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden text-lg font-semibold text-brand sm:block">
                    →
                  </div>

                  <div className="min-w-0 flex-1">
                    {connections.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2.5">
                        <span className="text-xs italic text-slate-400">
                          Sin conexiones
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {connections.map((conn, index) => {
                          const targetFolio =
                            folioByNodeId[conn.target];

                          return (
                            <div
                              key={`${node}-${conn.target}-${index}`}
                              title={conn.target}
                              className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-xs transition hover:border-brand/30 hover:bg-brand-muted"
                            >
                              {targetFolio !== undefined && (
                                <span className="rounded bg-brand-muted px-1.5 py-0.5 font-bold text-brand">
                                  #{targetFolio}
                                </span>
                              )}

                              <span className="font-bold text-ink">
                                {truncateId(conn.target)}
                              </span>

                              <span className="text-slate-300">|</span>

                              <span className="text-[10px] text-slate-400">
                                peso
                              </span>

                              <span className="font-bold text-brand">
                                {conn.weight}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};