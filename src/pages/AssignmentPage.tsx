import { ArrowRight, Info, Layers } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { error as showError } from '../hooks/useToast';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import type { AssignmentResultData } from '../types/graph';
import type { GraphAssignmentTransfer } from '../utils/graphToMatrix';
import {
  serializeAssignmentMatrix,
  translateGraphToCostMatrix,
} from '../utils/graphToMatrix';
import { useAssignmentStore } from '../store/useAssignmentStore';
import { Button } from '../ui';

// Tope de dimension. Debe coincidir con el size guard del backend
// (POST /graph/algorithms/assignment): el hungaro serializa la matriz
// completa en cada paso, asi que el payload crece como O(n^2) por paso.
const MAX_DIMENSION = 20;

const clampDimension = (value: number): number =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.floor(value) || 1));

/**
 * Dos jerarquias de input, una sola fuente de verdad.
 *
 * La etiqueta de fila/columna es METADATO: se edita una vez y no debe
 * competir con los costos, asi que va transparente y con borde inferior.
 * El costo es el DATO: va en caja, con foco visible y cifras tabulares
 * para que los digitos no bailen al cambiar de valor.
 *
 * Ojo con la cascada propia del proyecto: `button, input, textarea,
 * select { font: inherit }` vive fuera de @layer en index.css, asi que le
 * gana a las utilidades de tipografia de Tailwind. Por eso aca NO se le
 * clavan `text-sm`/`font-bold` al input (no tendrian efecto): el tamano y
 * la familia los aporta el contenedor. Concretamente, si el numero debe
 * verse monoespaciado se pone `font-mono` en la CELDA, no en el input.
 */
const LABEL_INPUT =
  'w-full min-w-[7rem] rounded-lg border-b border-white/20 bg-transparent px-2 py-1.5 text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

const COST_INPUT =
  'w-full min-w-[3.75rem] rounded-lg border border-white/10 bg-[#0b1328] px-1 py-2 text-center text-ink transition-colors focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30';

/** Controles de arriba (Filas / Columnas / Objetivo), en modo "instrumento". */
const CONTROL_BOX =
  'flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono transition focus-within:border-brand/40';

const CONTROL_CAPTION =
  'text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle';

const CONTROL_FIELD =
  'bg-transparent text-ink focus:outline-none';

const normalizeNumericInput = (value: string): string =>
  value.replace(/^0+(?=\d)/, '');

const hasFeasibleAssignment = (
  response: AssignmentResultData,
  costMatrix: (number | null)[][],
  rowLabels: string[],
  colLabels: string[],
  rows: number,
  cols: number
): boolean => {
  const expectedAssignments = Math.min(rows, cols);
  if (response.assignments.length !== expectedAssignments) return false;

  const rowIndexes = new Map(rowLabels.slice(0, rows).map((label, index) => [label, index]));
  const colIndexes = new Map(colLabels.slice(0, cols).map((label, index) => [label, index]));
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  return response.assignments.every(({ row, col }) => {
    const rowIndex = rowIndexes.get(row);
    const colIndex = colIndexes.get(col);
    if (
      rowIndex === undefined ||
      colIndex === undefined ||
      usedRows.has(rowIndex) ||
      usedCols.has(colIndex) ||
      costMatrix[rowIndex]?.[colIndex] === null
    ) {
      return false;
    }
    usedRows.add(rowIndex);
    usedCols.add(colIndex);
    return true;
  });
};

const AssignmentPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';

  // Payload opcional que manda la pizarra. Vive en el router state, asi
  // que sobrevive el refresh via history.state pero no un link directo.
  const graphTransfer = (location.state as { graphTransfer?: GraphAssignmentTransfer } | null)
    ?.graphTransfer;

  const {
    rows,
    cols,
    maximize,
    matrix,
    rowLabels,
    colLabels,
    result,
    resultSignature,
    showProcess,
    currentStep,
    boardSource,
    appliedBoard,
    setRows,
    setCols,
    setMaximize,
    setMatrix,
    setRowLabels,
    setColLabels,
    setResult,
    setResultSignature,
    setShowProcess,
    setCurrentStep,
    setBoardSource,
    setAppliedBoard,
  } = useAssignmentStore();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noSolution, setNoSolution] = useState(false);
  const [editingProhibitedCell, setEditingProhibitedCell] = useState<string | null>(
    null
  );

  /** Request en vuelo, para poder abortarlo al relanzar el calculo. */
  const abortInFlight = useRef<AbortController | null>(null);

  /**
   * Traduccion desde la pizarra. Las celdas sin conexion son null y quedan
   * bloqueadas; el objetivo se elige aca y la traduccion se recalcula.
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
        ? JSON.stringify({
            matrix: boardTranslation.translation.matrix,
            rowLabels: boardTranslation.translation.rowLabels,
            colLabels: boardTranslation.translation.colLabels,
          })
        : null,
    [boardTranslation]
  );

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
    setResultSignature(null);
    setNoSolution(false);
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
    const normalizedValue = normalizeNumericInput(value);
    const nextValue =
      normalizedValue.trim() === ''
        ? null
        : Number.isFinite(Number(normalizedValue))
          ? Number(normalizedValue)
          : undefined;

    if (nextValue !== undefined && nextValue !== null) {
      setEditingProhibitedCell(null);
    }

    setMatrix((current) =>
      current.map((row, rIndex) =>
        rIndex === rowIndex
          ? row.map((cell, cIndex) =>
              cIndex === colIndex
                ? nextValue === undefined
                  ? cell
                  : nextValue
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
    setNoSolution(false);

    try {
      // Leer el snapshot en el momento del clic evita que un render
      // anterior conserve la matriz original cuando el usuario edita y
      // calcula inmediatamente después.
      const currentState = useAssignmentStore.getState();
      const currentMatrix = currentState.matrix;
      const currentRows = currentState.rows;
      const currentCols = currentState.cols;
      const currentMaximize = currentState.maximize;
      const currentRowLabels = currentState.rowLabels;
      const currentColLabels = currentState.colLabels;
      const currentInputSignature = JSON.stringify({
        matrix: currentMatrix,
        rows: currentRows,
        cols: currentCols,
        rowLabels: currentRowLabels.slice(0, currentRows),
        colLabels: currentColLabels.slice(0, currentCols),
        maximize: currentMaximize,
      });

      const payload = {
        cost_matrix: serializeAssignmentMatrix(currentMatrix, currentMaximize),
        row_labels: currentRowLabels.slice(0, currentRows),
        col_labels: currentColLabels.slice(0, currentCols),
        maximize: currentMaximize,
      };
      const response = await GraphServiceAPI.runAssignment(
        payload,
        controller.signal
      );
      if (
        !hasFeasibleAssignment(
          response,
          currentMatrix,
          currentRowLabels,
          currentColLabels,
          currentRows,
          currentCols
        )
      ) {
        setResult(null);
        setResultSignature(null);
        setNoSolution(true);
        return;
      }

      // Sellamos la firma: si el usuario edita algo despues, el
      // resultado deja de mostrarse solo.
      setResultSignature(currentInputSignature);
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
      setNoSolution(false);
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

  /**
   * Matriz de un paso del algoritmo.
   *
   * Los valores son TEXTO (no inputs), asi que `font-mono` de la celda si
   * hace efecto. Las filas/columnas de padding quedan apagadas pero no se
   * esconden: el padding es parte del relato del metodo hungaro.
   */
  const renderStepMatrix = (
    matrixValue: (number | null)[][],
    isResultStep = false
  ) => {
    const stepRows = matrixValue.length;
    const stepCols = matrixValue[0]?.length ?? 0;

    return (
      <div className="custom-scrollbar overflow-x-auto rounded-xl border border-white/10 p-3">
        <table className="min-w-full border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-2 py-1 text-left font-semibold text-ink-muted"> </th>
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
                <th className="sticky left-0 z-10 bg-surface px-2 py-1 font-semibold text-ink-muted">
                  {dummyRows.has(rowIndex)
                    ? 'padding'
                    : rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}
                </th>
                {Array.from({ length: stepCols }, (_, colIndex) => {
                  const value = matrixValue[rowIndex]?.[colIndex];
                  const isDummy =
                    dummyRows.has(rowIndex) || dummyCols.has(colIndex);
                  // El backend recibe una penalización numérica para las
                  // celdas prohibidas porque su contrato solo acepta
                  // number[][]. La máscara original conserva su semántica
                  // durante todas las transformaciones del algoritmo.
                  const prohibited =
                    !isDummy &&
                    (matrix[rowIndex]?.[colIndex] === null ||
                      value === null ||
                      value === undefined);
                  const previousValue = prevStepMatrix[rowIndex]?.[colIndex];
                  const changed =
                    !prohibited && !isDummy && value !== previousValue;
                  const assigned =
                    isResultStep &&
                    !isDummy &&
                    assignedCells.has(`${rowIndex},${colIndex}`);

                  return (
                    <td
                      key={`step-cell-${rowIndex}-${colIndex}`}
                      className={`rounded-lg border px-2 py-1 text-center font-mono tabular-nums ${
                        isDummy
                          ? 'border-white/5 text-ink-subtle'
                          : prohibited
                            ? 'border-dashed border-white/20 bg-white/[0.02] text-ink-subtle'
                          : assigned
                            ? 'border-mission bg-mission/15 font-bold text-mission'
                            : changed
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-white/10 text-ink'
                      }`}
                    >
                      {prohibited ? 'Prohibida' : value ?? '—'}
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

  /**
   * Leyenda de la matriz de pasos.
   *
   * Los tres colores ya existian, pero nadie los explicaba: un cero con
   * borde amarillo no significa lo mismo que un cambio recien aplicado, y
   * las filas de padding se confundian con valores bajos.
   */
  const stepLegend = (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-mission bg-mission/20" />
        celda asignada
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-brand bg-brand/20" />
        cambió respecto del paso anterior
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15 bg-white/5" />
        fila o columna de padding
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-dashed border-white/20 bg-white/[0.02]" />
        celda prohibida
      </span>
    </p>
  );

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton to={returnTo} />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">mission control / 06</span>
      </div>

      <header className="glass-panel rise-in rounded-2xl p-5 sm:p-6">
        <p className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/10 px-3 py-2.5 text-sm leading-relaxed text-brand">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Este problema no trabaja con nodos del grafo. Es una matriz de costos
            entre <strong>trabajadores</strong> y <strong>tareas</strong>. Cada fila
            representa un trabajador y cada columna representa una tarea.
          </span>
        </p>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Nivel 06 · comando de misión</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">Asignación planetaria</h1>
            <p className="mt-1 text-sm text-ink-muted">Resuelve la misión óptima usando el algoritmo húngaro.</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono uppercase tracking-[0.16em] text-ink-muted">
                {rows} × {cols}
              </span>
              <span className="rounded-full border border-mission/30 bg-mission/10 px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-mission">
                {maximize ? 'maximizar beneficio' : 'minimizar costo'}
              </span>
              {boardSource && (
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-brand">
                  traducido desde la constelación
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className={CONTROL_BOX}>
              <span className={CONTROL_CAPTION}>Filas</span>
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
                className={`${CONTROL_FIELD} w-14 text-center`}
              />
            </label>

            <label className={CONTROL_BOX}>
              <span className={CONTROL_CAPTION}>Columnas</span>
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
                className={`${CONTROL_FIELD} w-14 text-center`}
              />
            </label>

            <label className={CONTROL_BOX}>
              <span className={CONTROL_CAPTION}>Objetivo</span>
              <select
                value={maximize ? 'maximize' : 'minimize'}
                onChange={(e) => setMaximize(e.target.value === 'maximize')}
                className={CONTROL_FIELD}
              >
                <option value="minimize" className="bg-surface text-ink">Minimizar costo</option>
                <option value="maximize" className="bg-surface text-ink">Maximizar beneficio</option>
              </select>
            </label>

            <Button
              type="button"
              onClick={handleRun}
              loading={loading}
              className="lg:ml-2"
            >
              Calcular asignación
            </Button>
          </div>
        </div>
      </header>

      {/* Aviso de traduccion desde la pizarra: va a ancho completo, antes
          del area de dos columnas, porque describe el ORIGEN de la matriz
          y no una sola de las dos piezas. */}
      {boardSource && boardTranslation?.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm leading-relaxed text-brand animate-in fade-in slide-in-from-top-2">
          <Layers aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Matriz traducida desde tu constelación:{' '}
            {boardTranslation.translation.edgeCount}{' '}
            {boardTranslation.translation.edgeCount === 1
              ? 'conexión'
              : 'conexiones'}
            . Las{' '}
            <strong>{boardTranslation.translation.emptyCells.length}</strong> celdas
            sin conexión aparecen como{' '}
            <span className="font-mono font-bold">Prohibida</span> y no son
            editables. Los costos de las conexiones existentes sí se pueden
            modificar.
          </span>
        </p>
      )}

      {/* La matriz (donde se edita) y el resultado (donde se lee) van
          lado a lado en desktop y se apilan en pantallas chicas. Si lo
          hacen, el orden es intencional: primero se edita, despues se lee. */}
      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="glass-panel min-w-0 rounded-2xl p-4 sm:p-5" aria-label="Matriz de costos">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink">Matriz de costos</h2>
            <p className="text-xs text-ink-muted">Editá los costos y los nombres de fila y columna.</p>
          </div>

          <div className="custom-scrollbar mt-4 overflow-x-auto rounded-xl border border-white/10 p-3">
            <table className="min-w-full border-separate border-spacing-2 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface px-2 py-1 text-left font-semibold text-ink-muted"> </th>
                  {Array.from({ length: cols }, (_, colIndex) => (
                    <th key={`col-${colIndex}`} className="px-2 py-1 font-mono text-ink-muted">
                      <input
                        aria-label={`Nombre de la columna ${colIndex + 1}`}
                        value={colLabels[colIndex] ?? `Tarea ${String.fromCharCode(65 + colIndex)}`}
                        onChange={(e) => {
                          const next = [...colLabels];
                          next[colIndex] = e.target.value;
                          setColLabels(next);
                        }}
                        className={LABEL_INPUT}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    <td className="sticky left-0 z-10 bg-surface px-2 py-1 font-semibold text-ink-muted">
                      <input
                        aria-label={`Nombre de la fila ${rowIndex + 1}`}
                        value={rowLabels[rowIndex] ?? `Trabajador ${rowIndex + 1}`}
                        onChange={(e) => {
                          const next = [...rowLabels];
                          next[rowIndex] = e.target.value;
                          setRowLabels(next);
                        }}
                        className={LABEL_INPUT}
                      />
                    </td>
                    {Array.from({ length: cols }, (_, colIndex) => {
                      const value = matrix[rowIndex]?.[colIndex] ?? null;
                      const prohibited = value === null;
                      return (
                      <td key={`cell-${rowIndex}-${colIndex}`} className="px-1 py-1 font-mono">
                        {prohibited && editingProhibitedCell !== `${rowIndex},${colIndex}` ? (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Sin conexión"
                            onClick={() =>
                              setEditingProhibitedCell(`${rowIndex},${colIndex}`)
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setEditingProhibitedCell(`${rowIndex},${colIndex}`);
                              }
                            }}
                            className={`${COST_INPUT} inline-flex items-center justify-center border-dashed border-white/20 bg-white/[0.02] text-[10px] text-ink-subtle`}
                          >
                            Prohibida
                          </span>
                        ) : (
                          <input
                            type="number"
                            aria-label={`Costo ${rowIndex + 1}, columna ${colIndex + 1}`}
                            value={value ?? ''}
                            autoFocus={prohibited}
                            placeholder={prohibited ? 'Costo' : undefined}
                            onFocus={(event) => {
                              event.currentTarget.value = normalizeNumericInput(
                                event.currentTarget.value
                              );
                            }}
                            onChange={(e) =>
                              updateCell(rowIndex, colIndex, e.target.value)
                            }
                            onBlur={() => {
                              if (matrix[rowIndex]?.[colIndex] === null) {
                                setEditingProhibitedCell(null);
                              }
                            }}
                            className={[
                              COST_INPUT,
                              assignedCells.has(`${rowIndex},${colIndex}`) &&
                                'border-mission bg-mission/15 text-mission',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />
                        )}
                      </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {freshResult && (
            <p className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-mission bg-mission/20" />
              celda asignada en la solución óptima
            </p>
          )}
        </section>

      {graphTransfer && boardTranslation && !boardTranslation.ok && (
        <div
          role="alert"
          className="rounded-2xl border border-error-border bg-error-bg p-4 text-sm font-medium text-error"
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

      {noSolution && (
        <div
          role="status"
          className="rounded-2xl border border-mission/30 bg-mission/10 p-4 text-sm font-medium text-mission"
        >
          No existe una asignación factible para este grafo.
        </div>
      )}

      {freshResult && (
          <section
            className="glass-panel animate-in fade-in slide-in-from-top-2 min-w-0 rounded-2xl border border-mission/25 p-5"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="eyebrow text-mission">asignación óptima</p>

              {stepCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowProcess((visible) => !visible)}
                  className="rounded-xl border border-mission/40 px-3 py-1.5 text-xs font-semibold text-mission transition-colors hover:bg-mission/10"
                >
                  {showProcess ? 'Ocultar proceso' : 'Ver proceso paso a paso'}
                </button>
              )}

            </div>

            <h2 className="mt-2 font-display text-lg font-bold text-ink">Resultado de la misión</h2>

            {/* El KPI va desacompanado a proposito: el numero es lo unico
                que se lee de lejos y `Costo total` deja de competir con el
                para volver a ser un caption. */}
            <div className="mt-4 rounded-2xl border border-mission/25 bg-mission/[0.07] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mission">costo total</p>
              <p className="mt-1 font-display text-5xl font-extrabold leading-none text-ink">
                <span>{freshResult.total_cost}</span>
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {maximize ? 'Maximización de beneficio' : 'Minimización de costo'} ·{' '}
                {freshResult.assignments.length}{' '}
                {freshResult.assignments.length === 1 ? 'asignación' : 'asignaciones'}
              </p>
            </div>

            {/* Asignaciones como pares origen → destino. En la tabla de
                tres columnas el usuario tenia que mirar tres veces para
                armar una sola oracion en la cabeza. */}
            <ul className="mt-4 space-y-2">
              {freshResult.assignments.map((assignment) => (
                <li
                  key={`${assignment.row}-${assignment.col}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
                      {assignment.row}
                    </span>
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                    <span className="truncate rounded-md bg-mission/10 px-2 py-1 text-xs font-semibold text-mission">
                      {assignment.col}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink">
                    {assignment.cost}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {activeStep && (
        <section className="glass-panel animate-in fade-in rounded-2xl border border-mission/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Proceso del algoritmo</h2>
              <p className="mt-0.5 text-xs text-ink-muted">El algoritmo húngaro desde la matriz inicial hasta la asignación óptima.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="rounded-full border border-mission/40 px-3 py-1 font-mono text-xs font-semibold text-mission">
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

          {/* Cada paso es un chip navegable. Con matrices grandes el
              hungaro genera muchos pasos y el slider solo sirve para
              saltar a ciegas: los chips muestran de un vistazo donde se
              esta y que viene. */}
          {stepCount > 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Pasos del algoritmo">
              {displaySteps.map((step, index) => (
                <button
                  key={`step-chip-${index}`}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  aria-pressed={index === Math.min(currentStep, stepCount - 1)}
                  title={step.name}
                  className={[
                    'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors',
                    index === Math.min(currentStep, stepCount - 1)
                      ? 'border-mission/50 bg-mission/15 text-mission'
                      : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-brand/40 hover:text-ink',
                  ].join(' ')}
                >
                  <span className="font-mono">{step.step}</span>
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
              ))}
            </div>
          )}

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
              className="w-40 accent-mission"
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

          <div className="mt-4 rounded-xl border border-mission/20 bg-mission/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-mission/15 px-2.5 py-1 font-mono text-xs font-bold text-mission">Paso {activeStep.step}</span>
              <span className="text-sm font-bold text-ink">{activeStep.name}</span>
              {typeof activeStep.min_uncovered === 'number' && (
                <span className="font-mono text-xs text-mission">mínimo no cubierto = {activeStep.min_uncovered}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-muted">{activeStep.description}</p>
          </div>

          <div className="mt-4">
            {renderStepMatrix(
              activeStep.matrix,
              activeStep === resultStep
            )}
            {stepLegend}
          </div>
        </section>
      )}
      </main>
      <aside className="h-full shrink-0" aria-label="Panel de propiedades y herramientas">
        <Sidebar />
      </aside>
    </div>
  );
};

export default AssignmentPage;