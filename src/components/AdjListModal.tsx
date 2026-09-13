import React, { useEffect } from 'react';
import type { AdjacencyListItem } from '../types/graph';

interface AdjListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, AdjacencyListItem[]> | null;
  folioByNodeId: Record<string, number>;
}

const MAX_ID_LENGTH = 15;

const truncateId = (id: string): string =>
  id.length > MAX_ID_LENGTH
    ? `${id.slice(0, MAX_ID_LENGTH)}…`
    : id;

export const AdjListModal: React.FC<AdjListModalProps> = ({
  isOpen,
  onClose,
  data,
  folioByNodeId,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) {
    return null;
  }

  const nodeKeys = Object.keys(data);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#242F40]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adj-list-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#05A8AA]/10 text-[#05A8AA]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
                  />
                </svg>
              </div>

              <div>
                <h2
                  id="adj-list-title"
                  className="text-lg font-extrabold tracking-tight text-[#242F40]"
                >
                  Lista de adyacencia
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Conexiones de cada nodo del grafo
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#242F40] focus:outline-none focus:ring-2 focus:ring-[#05A8AA]/30"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50/50 px-6 py-5">
          {nodeKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-3-3v6m8-3a8 8 0 11-16 0 8 8 0 0116 0z"
                  />
                </svg>
              </div>

              <p className="font-semibold text-[#242F40]">
                El grafo no contiene datos
              </p>

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
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#05A8AA]/30 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div
                        className="flex shrink-0 items-center gap-3 sm:w-64"
                        title={node}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#05A8AA]/30 bg-[#05A8AA]/10 text-[#05A8AA]">
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
                              <span className="ml-1.5 normal-case text-[#05A8AA]">
                                #{nodeFolio}
                              </span>
                            )}
                          </span>

                          <span className="block truncate font-mono text-sm font-bold text-[#242F40]">
                            {truncateId(node)}
                          </span>
                        </div>
                      </div>

                      <div className="hidden text-lg font-semibold text-[#05A8AA] sm:block">
                        →
                      </div>

                      <div className="min-w-0 flex-1">
                        {connections.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
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
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs transition hover:border-[#05A8AA]/30 hover:bg-[#05A8AA]/5"
                                >
                                  {targetFolio !== undefined && (
                                    <span className="rounded bg-[#05A8AA]/10 px-1.5 py-0.5 font-bold text-[#05A8AA]">
                                      #{targetFolio}
                                    </span>
                                  )}

                                  <span className="font-bold text-[#242F40]">
                                    {truncateId(conn.target)}
                                  </span>

                                  <span className="text-slate-300">|</span>

                                  <span className="text-[10px] text-slate-400">
                                    peso
                                  </span>

                                  <span className="font-bold text-[#05A8AA]">
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
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <span className="text-xs font-medium text-slate-400">
            {nodeKeys.length}{' '}
            {nodeKeys.length === 1 ? 'nodo' : 'nodos'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#05A8AA] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#078f91] focus:outline-none focus:ring-2 focus:ring-[#05A8AA]/30"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};