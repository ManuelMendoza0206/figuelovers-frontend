import React, { useMemo } from 'react';
import { Table } from 'lucide-react';
import { Modal } from '../ui';
import type { AdjacencyMatrixResponse } from '../types/graph';
import { truncateId } from '../lib/truncate';

interface MatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AdjacencyMatrixResponse | null;
  folioByNodeId: Record<string, number>;
}

export const MatrixModal: React.FC<MatrixModalProps> = ({
  isOpen,
  onClose,
  data,
  folioByNodeId,
}) => {
  const {
    rowSums,
    colSums,
    rowActiveCounts,
    colActiveCounts,
  } = useMemo(() => {
    if (!data || data.matrix.length === 0) {
      return {
        rowSums: [] as number[],
        colSums: [] as number[],
        rowActiveCounts: [] as number[],
        colActiveCounts: [] as number[],
      };
    }

    const computedRowSums = data.matrix.map((row) =>
      row.reduce((sum, value) => sum + value, 0)
    );

    const computedRowActiveCounts = data.matrix.map((row) =>
      row.reduce((count, value) => (value > 0 ? count + 1 : count), 0)
    );

    const columnCount = data.matrix[0]?.length ?? 0;

    const computedColSums = Array.from(
      { length: columnCount },
      (_, colIndex) =>
        data.matrix.reduce((sum, row) => sum + (row[colIndex] ?? 0), 0)
    );

    const computedColActiveCounts = Array.from(
      { length: columnCount },
      (_, colIndex) =>
        data.matrix.reduce(
          (count, row) => ((row[colIndex] ?? 0) > 0 ? count + 1 : count),
          0
        )
    );

    return {
      rowSums: computedRowSums,
      colSums: computedColSums,
      rowActiveCounts: computedRowActiveCounts,
      colActiveCounts: computedColActiveCounts,
    };
  }, [data]);

  if (!isOpen || !data) return null;

  const nodeCount = data.nodes.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Matriz de adyacencia"
      subtitle={`${data.is_directed ? 'Grafo dirigido' : 'Grafo no dirigido'} · ${nodeCount} × ${nodeCount}`}
      icon={<Table className="h-5 w-5" />}
      maxWidth="xl"
      footer={
        <div className="flex w-full justify-between items-center">
          <span className="text-xs font-medium text-slate-400">
            {nodeCount} {nodeCount === 1 ? 'nodo' : 'nodos'}
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
      {nodeCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-slate-300 shadow-sm">
            <Table className="h-7 w-7" />
          </div>
          <p className="font-semibold text-ink">El grafo no contiene nodos</p>
          <p className="mt-1 text-sm text-slate-500">
            No existe una matriz de adyacencia para mostrar.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-surface">
          <table className="min-w-max border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 border-b border-r border-border bg-surface px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Origen \ Destino
                </th>

                {data.nodes.map((node) => (
                  <th key={node} title={node} className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3 font-mono font-bold text-ink">
                    {folioByNodeId[node] !== undefined ? (
                      <div className="flex flex-col items-center leading-tight">
                        <span>#{folioByNodeId[node]}</span>
                        <span className="mt-0.5 text-[10px] font-normal normal-case text-slate-400">
                          {truncateId(node)}
                        </span>
                      </div>
                    ) : (
                      truncateId(node)
                    )}
                  </th>
                ))}

                <th className="sticky top-0 z-10 border-b border-l-2 border-border bg-surface-muted px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500" title="Suma de pesos de la fila">
                  Σ fila
                </th>

                <th className="sticky top-0 z-10 border-b border-l border-border bg-surface-muted px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500" title="Cantidad de conexiones activas en la fila">
                  Activos
                </th>
              </tr>
            </thead>

            <tbody>
              {data.matrix.map((row, rowIndex) => {
                const rowNode = data.nodes[rowIndex];
                return (
                  <tr key={rowNode ?? `row-${rowIndex}`} className="transition-colors hover:bg-brand-muted">
                    <th title={rowNode} className="sticky left-0 z-10 border-r border-border bg-surface px-4 py-3 font-mono font-bold text-ink">
                      {rowNode ? (
                        folioByNodeId[rowNode] !== undefined ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span>#{folioByNodeId[rowNode]}</span>
                            <span className="mt-0.5 text-[10px] font-normal normal-case text-slate-400">
                              {truncateId(rowNode)}
                            </span>
                          </div>
                        ) : (
                          truncateId(rowNode)
                        )
                      ) : (
                        rowIndex
                      )}
                    </th>

                    {row.map((value, colIndex) => {
                      const isConnected = value > 0;
                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className={`border-t border-border-muted px-4 py-3 font-mono font-medium transition ${
                            isConnected
                              ? 'bg-brand-muted font-bold text-brand'
                              : 'text-slate-300'
                          }`}
                        >
                          {value}
                        </td>
                      );
                    })}

                    <td className="border-t border-l-2 border-border bg-surface-muted px-4 py-3 font-mono font-bold text-ink">
                      {rowSums[rowIndex] ?? 0}
                    </td>

                    <td className="border-t border-l border-border bg-surface-muted px-4 py-3 font-mono font-bold text-ink">
                      {rowActiveCounts[rowIndex] ?? 0}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-surface-muted">
                <th className="sticky left-0 z-10 border-t-2 border-r border-border bg-surface-muted px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Σ columna
                </th>

                {colSums.map((sum, colIndex) => (
                  <td key={`col-sum-${colIndex}`} className="border-t-2 border-border bg-surface-muted px-4 py-3 font-mono font-bold text-ink">
                    {sum}
                  </td>
                ))}

                <td className="border-l-2 border-t-2 border-border bg-slate-100 px-4 py-3 font-mono font-extrabold text-brand">
                  {rowSums.reduce((total, value) => total + value, 0)}
                </td>

                <td className="border-l border-t-2 border-border bg-slate-100 px-4 py-3 font-mono font-extrabold text-brand">
                  {rowActiveCounts.reduce((total, count) => total + count, 0)}
                </td>
              </tr>

              <tr className="bg-surface-muted">
                <th className="sticky left-0 z-10 border-t border-r border-border bg-surface-muted px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Activos
                </th>

                {colActiveCounts.map((count, colIndex) => (
                  <td key={`col-active-${colIndex}`} className="border-t border-border bg-surface-muted px-4 py-3 font-mono font-bold text-ink">
                    {count}
                  </td>
                ))}

                <td className="border-l-2 border-t border-border bg-slate-100 px-4 py-3 font-mono font-extrabold text-brand">
                  {rowActiveCounts.reduce((total, count) => total + count, 0)}
                </td>

                <td className="border-l border-t border-border bg-slate-100 px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};