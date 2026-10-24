import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Navigation2 } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { GraphSketch } from '../components/GraphSketch';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import type { DijkstraResultData } from '../types/graph';
import { Button } from '../ui/Button';
import { extractApiErrorMessage } from '../utils/apiError';
import {
  buildDijkstraPayload,
  validateDijkstraInput,
} from '../utils/dijkstraInput';

/** Tope de nodos; debe coincidir con el backend (dijkstra_service.py). */
const MAX_DIJKSTRA_NODES = 100;

const FIELD =
  'w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/15';

const STEP_TAG =
  'font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-brand/80';

/**
 * Clases de estado para el dibujo de solo lectura. Literales a
 * propósito: Tailwind solo genera las utilidades que ve escritas.
 */
const NODE_FIXED = 'fill-brand';
const NODE_QUEUED = 'fill-amber-300';
const NODE_UNVISITED = 'fill-slate-600';
const TARGET_RING = 'stroke-violet-300';
const PATH_EDGE = 'stroke-brand';
const PLAIN_EDGE = 'stroke-white/25';

const LegendItem: React.FC<{ swatch: string; children: React.ReactNode }> = ({
  swatch,
  children,
}) => (
  <span className="flex items-center gap-2">
    <span aria-hidden className={`h-3 w-3 shrink-0 rounded ${swatch}`} />
    {children}
  </span>
);

const DijkstraPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges } = useGraphStore();
  const [result, setResult] = useState<DijkstraResultData | null>(null);
  const [resultSignature, setResultGraphSignature] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceOverride, setSourceOverride] = useState<string>('');
  const [targetOverride, setTargetOverride] = useState<string>('');
  const request = useRef<AbortController | null>(null);

  const nodeList = useMemo(() => nodes.map((node) => node.id), [nodes]);

  const displayName = (nodeId: string): string => {
    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

  /**
   * Origen/destino: solo se guarda lo que eligió el usuario; el default
   * se deriva de la lista de nodos (patrón de JohnsonPage). Si borran
   * el nodo elegido, el override deja de ser válido.
   */
  const source =
    sourceOverride && nodeList.includes(sourceOverride)
      ? sourceOverride
      : (nodeList[0] ?? '');
  const target =
    targetOverride && nodeList.includes(targetOverride)
      ? targetOverride
      : '';

  /**
   * Firma de la entrada con la que se lanzó el cálculo: grafo (topología
   * y pesos) + origen + destino. Cambia cualquiera de los tres y el
   * resultado se oculta solo, sin depender de que cada acción se acuerde
   * de limpiarlo.
   */
  const graphSignature = useMemo(
    () =>
      JSON.stringify({
        nodes: nodes.map((node) => node.id),
        edges: edges.map((edge) => [
          edge.source,
          edge.target,
          edge.data?.weight ?? null,
          edge.data?.is_directed ?? null,
        ]),
        source,
        target,
      }),
    [nodes, edges, source, target]
  );

  const freshResult =
    result !== null && resultSignature === graphSignature ? result : null;

  // Validación en cliente (misma regla que el backend): pesos negativos
  // se muestran ANTES de llamar, con las aristas y el camino a Johnson.
  const clientCheck = useMemo(
    () => validateDijkstraInput(nodes, edges, source),
    [nodes, edges, source]
  );

  const steps = freshResult?.steps ?? [];
  const currentStep = steps[stepIndex] ?? null;
  const isFinalStep = steps.length > 0 && stepIndex === steps.length - 1;

  const run = async () => {
    if (clientCheck.errors.length > 0) {
      setErrorMessage(clientCheck.errors[0]);
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = buildDijkstraPayload(nodes, edges, source, target || null);
      const next = await GraphServiceAPI.runDijkstra(payload, controller.signal);
      setResult(next);
      setResultGraphSignature(graphSignature);
      // Se arranca en el último paso: la pantalla muestra la respuesta
      // completa; el deslizador permite volver a recorrer el proceso.
      setStepIndex(Math.max(next.steps.length - 1, 0));
    } catch (error: unknown) {
      if (!isCanceled(error)) {
        setErrorMessage(extractApiErrorMessage(error, 'No se pudo calcular Dijkstra.'));
        setResult(null);
        setResultGraphSignature(null);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  /**
   * Estado de un nodo en el paso mostrado: fijado (distancia
   * definitiva), en cola (distancia tentativa conocida) o sin visitar
   * (todavía no se conoce ningún camino).
   */
  const nodeStates = useMemo(() => {
    const states = new Map<string, 'fixed' | 'queued' | 'unvisited'>();
    if (!freshResult || !currentStep) {
      for (const nodeId of nodeList) states.set(nodeId, 'unvisited');
      return states;
    }
    const visited = new Set(currentStep.visited_snapshot);
    for (const nodeId of nodeList) {
      if (visited.has(nodeId)) {
        states.set(nodeId, 'fixed');
      } else if (currentStep.distances_snapshot[nodeId] !== null) {
        states.set(nodeId, 'queued');
      } else {
        states.set(nodeId, 'unvisited');
      }
    }
    return states;
  }, [freshResult, currentStep, nodeList]);

  const pathEdgeIds = useMemo(
    () => new Set(freshResult?.target_path?.edges ?? []),
    [freshResult]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-ink">
        <p className="eyebrow">Nivel 06 · camino mínimo</p>
        <h1 className="mt-3 font-display text-2xl font-bold">No hay un grafo cargado</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Carga o crea una constelación en el editor y vuelve a Dijkstra.
        </p>
        <div className="mt-5 flex gap-3">
          <Link className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-[#07101f] transition hover:bg-brand-hover" to="/editor">Abrir editor</Link>
          <Link className="rounded-xl border border-white/15 px-4 py-2 text-sm text-ink transition hover:border-brand/40 hover:text-brand" to="/dashboard">Ver proyectos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <BackButton to={returnTo} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">shortest path / 06</span>
        </div>

        <header className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Nivel 06 · camino mínimo</p>
              <h1 className="mt-2 font-display text-2xl font-extrabold">Dijkstra</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                Calcula la distancia mínima desde un origen a todos los demás nodos.
                Respeta la dirección de cada arista (las no dirigidas se recorren en ambos
                sentidos) y requiere pesos no negativos.
              </p>
            </div>

            <Button
              onClick={run}
              loading={loading}
              size="md"
              disabled={nodeList.length === 0 || nodeList.length > MAX_DIJKSTRA_NODES}
              leftIcon={<Navigation2 aria-hidden className="h-4 w-4" />}
            >
              {loading ? 'Calculando…' : 'Calcular caminos'}
            </Button>
          </div>

          {nodeList.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-ink-muted">
                Origen (obligatorio)
                <select aria-label="Nodo origen" value={source} onChange={(event) => setSourceOverride(event.target.value)} className={`mt-1 ${FIELD}`}>
                  {nodeList.map((nodeId) => (
                    <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-ink-muted">
                Destino (opcional: solo resalta el camino)
                <select aria-label="Nodo destino" value={target} onChange={(event) => setTargetOverride(event.target.value)} className={`mt-1 ${FIELD}`}>
                  <option value="">— sin destino: todas las distancias —</option>
                  {nodeList.map((nodeId) => (
                    <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {clientCheck.negativeEdges.length > 0 && (
            <div role="alert" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] p-3 text-sm text-amber-200">
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                Dijkstra no admite pesos negativos. Aristas afectadas:{' '}
                {clientCheck.negativeEdges
                  .map((edge) => `${edge.fromLabel} → ${edge.toLabel} (${edge.weight})`)
                  .join(', ')}.
              </p>
              <Link
                to={`/johnson?from=${encodeURIComponent(returnTo)}`}
                className="mt-2 inline-flex rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                Usar Johnson (admite pesos negativos) →
              </Link>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
              {errorMessage}
            </div>
          )}

          {freshResult && freshResult.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {freshResult.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink-muted">
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          )}
        </header>

        {freshResult && (
          <section className="glass-panel animate-in fade-in slide-in-from-top-2 rounded-2xl border-brand/25 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
                  distancias desde {displayName(freshResult.source)}
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">
                  {freshResult.target
                    ? `Hasta ${displayName(freshResult.target)}: ${
                        freshResult.target_path?.total_distance === null
                          ? '∞ (inalcanzable)'
                          : freshResult.target_path?.total_distance
                      }`
                    : `${Object.keys(freshResult.distances).length} nodos alcanzables o no, calculados`}
                </p>
              </div>
              <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[11px] font-semibold text-brand">
                {freshResult.order_visited.length} de {nodeList.length} nodos fijados
              </span>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-white/10 bg-[#0b1328]/50 p-4">
                <GraphSketch
                  nodes={nodes.map((node) => ({
                    id: node.id,
                    label: node.data?.label?.trim() || node.id,
                    position: node.position,
                  }))}
                  edges={edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    weight: edge.data?.weight,
                    isDirected: edge.data?.is_directed === true,
                  }))}
                  ariaLabel="Grafo de solo lectura con el estado del paso actual"
                  className="h-80 w-full"
                  nodeStyle={(nodeId) => {
                    const state = nodeStates.get(nodeId) ?? 'unvisited';
                    return {
                      fillClass:
                        state === 'fixed'
                          ? NODE_FIXED
                          : state === 'queued'
                            ? NODE_QUEUED
                            : NODE_UNVISITED,
                      ringClass:
                        nodeId === freshResult.target ? TARGET_RING : undefined,
                    };
                  }}
                  edgeStyle={(edgeId) =>
                    isFinalStep && pathEdgeIds.has(edgeId)
                      ? { strokeClass: PATH_EDGE, width: 3 }
                      : { strokeClass: PLAIN_EDGE, width: 1.5 }
                  }
                  nodeBadge={(nodeId) => {
                    const distance = currentStep?.distances_snapshot[nodeId];
                    if (distance === undefined) return null;
                    return distance === null ? '∞' : `${distance}`;
                  }}
                />

                <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
                  <LegendItem swatch="bg-brand">fijado</LegendItem>
                  <LegendItem swatch="bg-amber-300">en cola (tentativo)</LegendItem>
                  <LegendItem swatch="bg-slate-600">sin visitar</LegendItem>
                  {freshResult.target && <LegendItem swatch="bg-violet-300">destino</LegendItem>}
                  {freshResult.target_path && freshResult.target_path.edges.length > 0 && (
                    <LegendItem swatch="bg-brand">camino al destino (al llegar al último paso)</LegendItem>
                  )}
                </p>

                {steps.length > 0 && currentStep && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className={STEP_TAG}>paso a paso</p>
                      <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-xs font-semibold text-brand">
                        Paso {currentStep.step} de {steps.length}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={stepIndex === 0}
                        onClick={() => setStepIndex((value) => value - 1)}
                      >
                        ← Anterior
                      </Button>
                      <input
                        aria-label="Paso actual"
                        className="min-w-0 flex-1 accent-brand"
                        type="range"
                        min="0"
                        max={steps.length - 1}
                        value={stepIndex}
                        onChange={(event) => setStepIndex(Number(event.target.value))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={stepIndex >= steps.length - 1}
                        onClick={() => setStepIndex((value) => value + 1)}
                      >
                        Siguiente →
                      </Button>
                    </div>

                    <p className="mt-3 text-sm text-ink">
                      Se fija <strong>{displayName(currentStep.node)}</strong> con distancia{' '}
                      <strong className="font-mono">{currentStep.distance}</strong>.
                    </p>

                    {currentStep.relaxations.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                        {currentStep.relaxations.map((relaxation, index) => (
                          <li
                            key={`${relaxation.edge_id}-${index}`}
                            className={relaxation.improved ? 'text-ink' : ''}
                          >
                            <span className="font-mono">
                              {displayName(relaxation.from)} → {displayName(relaxation.to)}
                            </span>{' '}
                            (arista {relaxation.edge_id}):{' '}
                            <span className="font-mono">
                              {relaxation.old_distance === null ? '∞' : relaxation.old_distance}
                              {' → '}
                              {relaxation.new_distance}
                            </span>{' '}
                            {relaxation.improved ? (
                              <span className="font-bold text-brand">✓ mejoró</span>
                            ) : (
                              <span className="text-ink-subtle">no mejoró</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-ink-subtle">Sin aristas de salida: no hay nada que relajar.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-brand/25 bg-brand/[0.05] p-4">
                  <h2 className="font-display text-base font-bold text-ink">Camino al destino</h2>
                  {freshResult.target ? (
                    <>
                      <p className="mt-2 text-sm text-ink-muted">
                        {displayName(freshResult.source)} → {displayName(freshResult.target)}
                      </p>
                      <div className="mt-3 rounded-xl border border-brand/25 bg-brand/10 p-4 text-sm font-semibold text-brand">
                        {freshResult.target_path && freshResult.target_path.nodes.length > 0
                          ? freshResult.target_path.nodes.map(displayName).join(' → ')
                          : 'No hay camino: el destino es inalcanzable (∞).'}
                      </div>
                      {freshResult.target_path && freshResult.target_path.total_distance !== null && (
                        <p className="mt-2 font-mono text-xs text-ink-subtle">
                          distancia total: {freshResult.target_path.total_distance}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-ink-muted">
                      Elige un destino para resaltar un camino concreto. Sin destino se
                      muestran igual las distancias a todos los nodos.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h2 className="font-display text-base font-bold text-ink">Distancias</h2>
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    {currentStep
                      ? `Estado al fijar ${displayName(currentStep.node)} (paso ${currentStep.step}).`
                      : 'Estado final.'}
                  </p>
                  <table className="mt-3 min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
                        <th className="border-b border-white/10 py-1.5 pr-3 font-semibold">Nodo</th>
                        <th className="border-b border-white/10 py-1.5 pr-3 font-semibold">Distancia</th>
                        <th className="border-b border-white/10 py-1.5 font-semibold">Camino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodeList.map((nodeId) => {
                        const snapshot = currentStep?.distances_snapshot ?? freshResult.distances;
                        const distance = snapshot[nodeId];
                        const path = freshResult.paths[nodeId] ?? [];
                        return (
                          <tr key={nodeId} className={nodeId === freshResult.source ? 'text-brand' : ''}>
                            <td className="border-b border-white/10 py-1.5 pr-3 font-semibold">{displayName(nodeId)}</td>
                            <td className="border-b border-white/10 py-1.5 pr-3 font-mono tabular-nums">
                              {distance === null || distance === undefined ? '∞' : distance}
                            </td>
                            <td className="border-b border-white/10 py-1.5 text-xs text-ink-muted">
                              {path.length > 0 ? path.map(displayName).join(' → ') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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

export default DijkstraPage;
