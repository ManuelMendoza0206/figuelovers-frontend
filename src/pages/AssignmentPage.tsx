import React, { useMemo, useState } from 'react';
import { GraphServiceAPI } from '../services/api';
import type { AssignmentResultData } from '../types/graph';

const makeMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));

const AssignmentPage: React.FC = () => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [maximize, setMaximize] = useState(false);
  const [matrix, setMatrix] = useState<number[][]>(() => makeMatrix(3, 3));
  const [rowLabels, setRowLabels] = useState(['Trabajador 1', 'Trabajador 2', 'Trabajador 3']);
  const [colLabels, setColLabels] = useState(['Tarea A', 'Tarea B', 'Tarea C']);
  const [result, setResult] = useState<AssignmentResultData | null>(null);
  const [loading, setLoading] = useState(false);

  const assignmentPairs = useMemo(
    () => new Set(result?.assignments.map((item) => `${item.row}|${item.col}`) ?? []),
    [result]
  );

  const syncMatrixDimensions = (nextRows: number, nextCols: number) => {
    const nextMatrix = Array.from({ length: nextRows }, (_, rowIndex) =>
      Array.from({ length: nextCols }, (_, colIndex) => {
        const previousRow = matrix[rowIndex] ?? [];
        const previousValue = previousRow[colIndex];
        return typeof previousValue === 'number' ? previousValue : 1;
      })
    );

    setMatrix(nextMatrix);
    setRowLabels((prev) =>
      Array.from({ length: nextRows }, (_, idx) => prev[idx] ?? `Trabajador ${idx + 1}`)
    );
    setColLabels((prev) =>
      Array.from({ length: nextCols }, (_, idx) => prev[idx] ?? `Tarea ${String.fromCharCode(65 + idx)}`)
    );
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const numericValue = Number(value);
    setMatrix((current) =>
      current.map((row, rIndex) =>
        rIndex === rowIndex
          ? row.map((cell, cIndex) => (cIndex === colIndex ? Number.isFinite(numericValue) ? numericValue : 0 : cell))
          : row
      )
    );
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const payload = {
        cost_matrix: matrix,
        row_labels: rowLabels.slice(0, rows),
        col_labels: colLabels.slice(0, cols),
        maximize,
      };
      const response = await GraphServiceAPI.runAssignment(payload);
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Este problema no trabaja con nodos del grafo. Es una matriz de costos entre <strong>trabajadores</strong> y <strong>tareas</strong>.
          Cada fila representa un trabajador y cada columna representa una tarea.
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Problema de Asignación</h1>
            <p className="mt-1 text-sm text-slate-500">Resuelve la asignación óptima usando el algoritmo húngaro.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">
              <span className="mr-2">Filas</span>
              <input
                type="number"
                min={1}
                max={8}
                value={rows}
                onChange={(e) => {
                  const nextRows = Math.max(1, Number(e.target.value) || 1);
                  setRows(nextRows);
                  syncMatrixDimensions(nextRows, cols);
                }}
                className="w-20 rounded-lg border border-slate-200 p-2"
              />
            </label>

            <label className="text-sm text-slate-600">
              <span className="mr-2">Columnas</span>
              <input
                type="number"
                min={1}
                max={8}
                value={cols}
                onChange={(e) => {
                  const nextCols = Math.max(1, Number(e.target.value) || 1);
                  setCols(nextCols);
                  syncMatrixDimensions(rows, nextCols);
                }}
                className="w-20 rounded-lg border border-slate-200 p-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={maximize} onChange={(e) => setMaximize(e.target.checked)} />
              Maximizar
            </label>

            <button
              type="button"
              onClick={handleRun}
              disabled={loading}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Calculando…' : 'Calcular asignación'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-semibold text-slate-700"> </th>
              {Array.from({ length: cols }, (_, colIndex) => (
                <th key={`col-${colIndex}`} className="px-2 py-1 text-slate-700">
                  <input
                    value={colLabels[colIndex] ?? `Tarea ${String.fromCharCode(65 + colIndex)}`}
                    onChange={(e) => {
                      const next = [...colLabels];
                      next[colIndex] = e.target.value;
                      setColLabels(next);
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2 text-center"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <td className="px-2 py-1 font-semibold text-slate-700">
                  <input
                    value={rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}
                    onChange={(e) => {
                      const next = [...rowLabels];
                      next[rowIndex] = e.target.value;
                      setRowLabels(next);
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2"
                  />
                </td>
                {Array.from({ length: cols }, (_, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="px-1 py-1">
                    <input
                      type="number"
                      value={matrix[rowIndex]?.[colIndex] ?? 0}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={`w-20 rounded-lg border p-2 text-center ${assignmentPairs.has(`${rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}|${colLabels[colIndex] ?? `Tarea ${String.fromCharCode(65 + colIndex)}`}`) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Resultado</h2>
          <p className="mt-1 text-sm text-slate-500">Costo total: <span className="font-semibold text-slate-800">{result.total_cost}</span></p>

          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Fila</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Columna</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Costo</th>
                </tr>
              </thead>
              <tbody>
                {result.assignments.map((assignment) => (
                  <tr key={`${assignment.row}-${assignment.col}`} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-700">{assignment.row}</td>
                    <td className="px-3 py-2 text-slate-700">{assignment.col}</td>
                    <td className="px-3 py-2 text-slate-700">{assignment.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentPage;