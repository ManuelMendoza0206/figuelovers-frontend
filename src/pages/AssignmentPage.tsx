import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { error as showError } from '../hooks/useToast';
import { GraphServiceAPI, isCanceled } from '../services/api';
import type { AssignmentResultData } from '../types/graph';
import { extractApiErrorMessage } from '../utils/apiError';
import type { GraphAssignmentTransfer } from '../utils/graphToMatrix';
import { translateGraphToCostMatrix } from '../utils/graphToMatrix';

// Tope de dimension. Debe coincidir con el size guard del backend
// (POST /graph/algorithms/assignment): el hungaro serializa la matriz
// completa en cada paso, asi que el payload crece como O(n^2) por paso.
const MAX_DIMENSION = 20;

const clampDimension = (value: number): number =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.floor(value) || 1));

const makeMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));

const AssignmentPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';

  // Payload opcional que manda la pizarra. Vive en el router state, asi
  // que sobrevive el refresh via history.state pero no un link directo.
  const graphTransfer = (location.state as { graphTransfer?: GraphAssignmentTransfer } | null)
    ?.graphTransfer;

  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [maximize, setMaximize] = useState(false);
  const [matrix, setMatrix] = useState<number[][]>(() => makeMatrix(3, 3));
  const [rowLabels, setRowLabels] = useState(['Trabajador 1', 'Trabajador 2', 'Trabajador 3']);
  const [colLabels, setColLabels] = useState(['Tarea A', 'Tarea B', 'Tarea C']);
  const [result, setResult] = useState<AssignmentResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProcess, setShowProcess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [boardSource, setBoardSource] = useState(false);

  /** Request en vuelo, para poder abortarlo al relanzar el calculo. */
  const abortInFlight = useRef<AbortController | null>(null);

  /**
   * Traduccion desde la pizarra. Las celdas sin conexion arrancan en 0
   * y quedan editables; el objetivo se elige aca y la traduccion se
   * recalcula cuando cambia.
   */
  const boardTranslation = useMemo(() => {
    if (!graphTransfer) return null;
    return translateGraphToCostMatrix(
      graphTransfer.nodes,
      graphTransfer.edges,
      maximize ? 'maximize' : 'minimize'
    );
  }, [graphTransfer, maximize]);

  /**
   * Firma de los inputs con los que se lanzo el calculo.
   *
   * Defensa contra un bug real: antes, editar una celda, cambiar las
   * dimensiones o cambiar el objetivo dejaban el resultado viejo en
   * pantalla, mostrando una asignacion que ya no correspondia a la
   * matriz. Olvidarse de limpiar `result` en cada mutacion es la
   * trampa; con esta firma la invalidacion queda ESTRUCTURAL: si los
   * inputs cambiaron, `freshResult` es null por definicion y no existe
   * ningun camino capaz de mostrar un resultado obsoleto.
   */
  const inputSignature = useMemo(
    () =>
      JSON.stringify({
        matrix,
        rows,
        cols,
        rowLabels: rowLabels.slice(0, rows),
        colLabels: colLabels.slice(0, cols),
        maximize,
      }),
    [matrix, rows, cols, rowLabels, colLabels, maximize]
  );

  const [resultSignature, setResultSignature] = useState<string | null>(null);

  const freshResult =
    result !== null && resultSignature === inputSignature ? result : null;

  /**
  * Firma de la matriz que esta aplicada. Si la traduccion cambio (por
  * ejemplo el usuario switched de minimize a maximize), re-aplicamos.
  *
  * Ajustamos durante el render y no en un useEffect a proposito: es el
  * patron que React documenta para "derivar estado de props" y evita
  * el primer render con la matriz vieja ya pintado.
  */
  const appliedSignature = useMemo(
    () =>
      boardTranslation?.ok
        ? JSON.stringify(boardTranslation.translation.matrix)
        : null,
    [boardTranslation]
  );

  const [appliedBoard, setAppliedBoard] = useState<string | null>(null);

  if (boardTranslation?.ok && appliedSignature !== appliedBoard) {
    const { matrix: next, rowLabels: nextRows, colLabels: nextCols } =
      boardTranslation.translation;

    setAppliedBoard(appliedSignature);
    setMatrix(next);
    setRowLabels(nextRows);
    setColLabels(nextCols);
    setRows(nextRows.length);
    setCols(nextCols.length);
    setResult(null);
    setShowProcess(false);
    setCurrentStep(0);
    setBoardSource(true);
  }

  // Sin paso sintetico: el backend ya cierra la secuencia con
  // "Select Independent Zeros", que trae la asignacion optima.
  const displaySteps = useMemo(() => freshResult?.steps ?? [], [freshResult]);

  const resultStep = useMemo(
    () =>
      displaySteps.find(
        (step) => (step.selected_zeros?.length ?? 0) > 0
      ) ?? null,
    [displaySteps]
  );

  // Claves "fila,columna" de la asignacion optima, en indices de la
  // matriz ORIGINAL. Evita depender de los nombres de las etiquetas,
  // que antes fallaba en silencio si el backend no coincidia.
  const assignedCells = useMemo(() => {
    const cells = new Set<string>();
    resultStep?.selected_zeros?.forEach(([rowIndex, colIndex]) =>
      cells.add(`${rowIndex},${colIndex}`)
    );
    return cells;
  }, [resultStep]);

  const dummyRows = useMemo(
    () => new Set(freshResult?.padding_info?.dummy_rows ?? []),
    [freshResult]
  );

  const dummyCols = useMemo(
    () => new Set(freshResult?.padding_info?.dummy_cols ?? []),
    [freshResult]
  );

  const syncMatrixDimensions = (nextRows: number, nextCols: number) => {
    const safeRows = clampDimension(nextRows);
    const safeCols = clampDimension(nextCols);

    const nextMatrix = Array.from({ length: safeRows }, (_, rowIndex) =>
      Array.from({ length: safeCols }, (_, colIndex) => {
        const previousRow = matrix[rowIndex] ?? [];
        const previousValue = previousRow[colIndex];
        return typeof previousValue === 'number' ? previousValue : 1;
      })
    );

    setMatrix(nextMatrix);
    setRowLabels((prev) =>
      Array.from({ length: safeRows }, (_, idx) => prev[idx] ?? `Trabajador ${idx + 1}`)
    );
    setColLabels((prev) =>
      Array.from({ length: safeCols }, (_, idx) => prev[idx] ?? `Tarea ${String.fromCharCode(65 + idx)}`)
    );
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setMatrix((current) =>
      current.map((row, rIndex) =>
        rIndex === rowIndex
          ? row.map((cell, cIndex) =>
              cIndex === colIndex
                ? Number.isFinite(Number(value))
                  ? Number(value)
                  : 0
                : cell
            )
          : row
      )
    );
  };

  const handleRun = async () => {
    // Si el usuario relanza el calculo, abortamos el request anterior:
    // si no, dos clicks rapidos generan dos requests y el que responde
    // ultimo pisa al otro, que no necesariamente es el mas nuevo.
    abortInFlight.current?.abort();
    const controller = new AbortController();
    abortInFlight.current = controller;

    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        cost_matrix: matrix,
        row_labels: rowLabels.slice(0, rows),
        col_labels: colLabels.slice(0, cols),
        maximize,
      };
      const response = await GraphServiceAPI.runAssignment(
        payload,
        controller.signal
      );
      // Sellamos la firma: si el usuario edita algo despues, el
      // resultado deja de mostrarse solo.
      setResultSignature(inputSignature);
      setResult(response);
      setCurrentStep(0);
      setShowProcess(false);
    } catch (err: unknown) {
      // Una cancelacion no es un error que deba mostrarse.
      if (isCanceled(err) || controller.signal.aborted) {
        return;
      }

      setResult(null);
      setResultSignature(null);
      const message = extractApiErrorMessage(
        err,
        'No se pudo calcular la asignación.'
      );
      setErrorMessage(message);
      showError(message);
    } finally {
      if (abortInFlight.current === controller) {
        abortInFlight.current = null;
        setLoading(false);
      }
    }
  };

  const stepCount = displaySteps.length;
  const activeStep =
    showProcess && stepCount > 0
      ? displaySteps[Math.min(currentStep, stepCount - 1)] ?? null
      : null;

  const prevStepMatrix =
    activeStep && currentStep === 0
      ? freshResult?.initial_cost_matrix ?? []
      : activeStep
        ? displaySteps[currentStep - 1]?.matrix ?? []
        : [];

  const renderStepMatrix = (matrixValue: number[][], isResultStep = false) => {
    const stepRows = matrixValue.length;
    const stepCols = matrixValue[0]?.length ?? 0;

    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1328]/40 p-3">
        <table className="min-w-full border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-semibold text-ink-muted"> </th>
              {Array.from({ length: stepCols }, (_, colIndex) => (
                <th key={`step-col-${colIndex}`} className="px-2 py-1 text-ink-muted">
                  {dummyCols.has(colIndex)
                    ? 'padding'
                    : colLabels[colIndex] ?? `Tarea ${String.fromCharCode(65 + colIndex)}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: stepRows }, (_, rowIndex) => (
              <tr key={`step-row-${rowIndex}`} className={dummyRows.has(rowIndex) ? 'opacity-40' : undefined}>
                <th className="px-2 py-1 font-semibold text-ink-muted">
                  {dummyRows.has(rowIndex)
                    ? 'padding'
                    : rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}
                </th>
                {Array.from({ length: stepCols }, (_, colIndex) => {
                  const value = matrixValue[rowIndex]?.[colIndex];
                  const isDummy =
                    dummyRows.has(rowIndex) || dummyCols.has(colIndex);
                  const previousValue = prevStepMatrix[rowIndex]?.[colIndex];
                  const changed = !isDummy && value !== previousValue;
                  const assigned =
                    isResultStep &&
                    !isDummy &&
                    assignedCells.has(`${rowIndex},${colIndex}`);

                  return (
                    <td
                      key={`step-cell-${rowIndex}-${colIndex}`}
                      className={`rounded-lg border px-2 py-1 text-center font-mono ${
                        isDummy
                          ? 'border-white/5 text-ink-subtle'
                          : assigned
                            ? 'border-[#ffd684] bg-[#ffd684]/15 font-bold text-[#ffd684]'
                            : changed
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-white/10 text-ink'
                      }`}
                    >
                      {value ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton to={returnTo} />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">mission control / 06</span>
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-4 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-brand">
          Este problema no trabaja con nodos del grafo. Es una matriz de costos entre <strong>trabajadores</strong> y <strong>tareas</strong>.
          Cada fila representa un trabajador y cada columna representa una tarea.
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Nivel 06 · comando de misión</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">Asignación planetaria</h1>
            <p className="mt-1 text-sm text-ink-muted">Resuelve la misión óptima usando el algoritmo húngaro.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-ink-muted">
              <span className="mr-2">Filas</span>
              <input
                type="number"
                min={1}
                max={MAX_DIMENSION}
                value={rows}
                onChange={(e) => {
                  const nextRows = clampDimension(Number(e.target.value));
                  setRows(nextRows);
                  syncMatrixDimensions(nextRows, cols);
                }}
                className="w-20 rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink"
              />
            </label>

            <label className="text-sm text-ink-muted">
              <span className="mr-2">Columnas</span>
              <input
                type="number"
                min={1}
                max={MAX_DIMENSION}
                value={cols}
                onChange={(e) => {
                  const nextCols = clampDimension(Number(e.target.value));
                  setCols(nextCols);
                  syncMatrixDimensions(rows, nextCols);
                }}
                className="w-20 rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink"
              />
            </label>

            <label className="text-sm text-ink-muted">
              <span className="mr-2">Objetivo</span>
              <select value={maximize ? 'maximize' : 'minimize'} onChange={(e) => setMaximize(e.target.value === 'maximize')} className="rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink">
                <option value="minimize">Minimizar costo</option>
                <option value="maximize">Maximizar beneficio</option>
              </select>
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

      <div className="glass-panel overflow-auto rounded-2xl p-4">
        <table className="min-w-full border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
                  <th className="px-2 py-1 text-left font-semibold text-ink-muted"> </th>
              {Array.from({ length: cols }, (_, colIndex) => (
                <th key={`col-${colIndex}`} className="px-2 py-1 text-ink-muted">
                  <input
                    value={colLabels[colIndex] ?? `Tarea ${String.fromCharCode(65 + colIndex)}`}
                    onChange={(e) => {
                      const next = [...colLabels];
                      next[colIndex] = e.target.value;
                      setColLabels(next);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-center text-ink"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <td className="px-2 py-1 font-semibold text-ink-muted">
                  <input
                    value={rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}
                    onChange={(e) => {
                      const next = [...rowLabels];
                      next[rowIndex] = e.target.value;
                      setRowLabels(next);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink"
                  />
                </td>
                {Array.from({ length: cols }, (_, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="px-1 py-1">
                    <input
                      type="number"
                      value={matrix[rowIndex]?.[colIndex] ?? 0}
                      onChange={(e) =>
                        updateCell(rowIndex, colIndex, e.target.value)
                      }
                      className={`w-20 rounded-lg border p-2 text-center text-ink ${
                        assignedCells.has(`${rowIndex},${colIndex}`)
                          ? 'border-[#ffd684] bg-[#ffd684]/15 text-[#ffd684]'
                          : 'border-white/10 bg-[#0b1328]'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {boardSource && boardTranslation?.ok && (
        <div className="mb-4 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-brand">
          Matriz traducida desde tu constelación:{' '}
          {boardTranslation.translation.edgeCount}{' '}
          {boardTranslation.translation.edgeCount === 1
            ? 'conexión'
            : 'conexiones'}
          . Las{' '}
          <strong>{boardTranslation.translation.emptyCells.length}</strong> celdas
          sin conexión quedaron en{' '}
          <span className="font-mono font-bold">0</span> y son editables.
          {' '}<strong>Ojo:</strong> el 0 es el valor más barato, así que si las
          dejás así el algoritmo va a elegir justamente esas parejas. Poné el
          costo real, o un valor alto si querés que queden prohibidas.
        </div>
      )}

      {graphTransfer && boardTranslation && !boardTranslation.ok && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-error-border bg-error-bg p-3 text-sm text-error"
        >
          No se pudo traducir la constelación: {boardTranslation.blocked.reason}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-error-border bg-error-bg p-4 text-sm font-medium text-error"
        >
          {errorMessage}
        </div>
      )}

      {freshResult && (
        <div className="glass-panel rounded-2xl border-[#ffd684]/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Resultado de la misión</h2>
              <p className="mt-1 text-sm text-ink-muted">Costo total: <span className="font-semibold text-brand">{freshResult.total_cost}</span></p>
            </div>

            {stepCount > 0 && (
              <button
                type="button"
                onClick={() => setShowProcess((visible) => !visible)}
                className="rounded-xl border border-[#ffd684]/40 px-3 py-1.5 text-xs font-semibold text-[#ffd684] transition-colors hover:bg-[#ffd684]/10"
              >
                {showProcess ? 'Ocultar proceso' : 'Ver proceso paso a paso'}
              </button>
            )}
          </div>

          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#ffd684]/10">
                <tr>
                  <th className="px-3 py-2 font-semibold text-[#ffd684]">Fila</th>
                  <th className="px-3 py-2 font-semibold text-[#ffd684]">Columna</th>
                  <th className="px-3 py-2 font-semibold text-[#ffd684]">Costo</th>
                </tr>
              </thead>
              <tbody>
                {freshResult.assignments.map((assignment) => (
                  <tr key={`${assignment.row}-${assignment.col}`} className="border-t border-white/10">
                    <td className="px-3 py-2 text-ink">{assignment.row}</td>
                    <td className="px-3 py-2 text-ink">{assignment.col}</td>
                    <td className="px-3 py-2 font-mono text-[#ffd684]">{assignment.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeStep && (
        <div className="glass-panel rounded-2xl border-[#ffd684]/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Proceso del algoritmo</h2>
              <p className="mt-0.5 text-xs text-ink-muted">El algoritmo húngaro desde la matriz inicial hasta la asignación óptima.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="rounded-full border border-[#ffd684]/40 px-3 py-1 font-mono text-xs font-semibold text-[#ffd684]">
                Paso {Math.min(currentStep, stepCount - 1) + 1} de {stepCount}
              </span>

              <button
                type="button"
                onClick={() => setShowProcess(false)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
              >
                Volver al resultado
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              disabled={currentStep === 0}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>

            <input
              type="range"
              min={0}
              max={stepCount - 1}
              value={Math.min(currentStep, stepCount - 1)}
              onChange={(event) => setCurrentStep(Number(event.target.value))}
              aria-label="Paso del algoritmo"
              className="w-40 accent-[#ffd684]"
            />

            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.min(stepCount - 1, step + 1))}
              disabled={currentStep >= stepCount - 1}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-[#ffd684]/20 bg-[#ffd684]/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#ffd684]/15 px-2.5 py-1 font-mono text-xs font-bold text-[#ffd684]">Paso {activeStep.step}</span>
              <span className="text-sm font-bold text-ink">{activeStep.name}</span>
              {typeof activeStep.min_uncovered === 'number' && (
                <span className="font-mono text-xs text-[#ffd684]">mínimo no cubierto = {activeStep.min_uncovered}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-muted">{activeStep.description}</p>
          </div>

          <div className="mt-4">
            {renderStepMatrix(
              activeStep.matrix,
              activeStep === resultStep
            )}
          </div>
        </div>
      )}
      </main>
      <aside className="h-full shrink-0" aria-label="Panel de propiedades y herramientas">
        <Sidebar />
      </aside>
    </div>
  );
};

export default AssignmentPage;