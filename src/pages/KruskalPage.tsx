import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Network } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { GraphSketch } from '../components/GraphSketch';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import type { KruskalObjective, KruskalResultData } from '../types/graph';
import { Button } from '../ui/Button';
import { extractApiErrorMessage } from '../utils/apiError';
import { buildKruskalPayload, validateKruskalInput } from '../utils/kruskalInput';

const FIELD =
  'w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/15';

const STEP_TAG =
  'font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300/80';

/**
 * Un color por componente para el dibujo. Literales a propósito:
 * Tailwind solo genera las utilidades que ve escritas.
 */
const COMPONENT_FILLS = [
  'fill-brand',
  'fill-amber-300',
  'fill-violet-300',
  'fill-rose-300',
  'fill-emerald-300',
  'fill-sky-300',
  'fill-orange-300',
  'fill-teal-300',
];

const ACCEPTED_EDGE = 'stroke-emerald-300';
const REJECTED_EDGE = 'stroke-rose-400';
const PLAIN_EDGE = 'stroke-white/25';

const OBJECTIVES: { id: KruskalObjective; label: string }[] = [
  { id: 'min', label: 'Mínimo' },
  { id: 'max', label: 'Máximo' },
];

const LegendItem: React.FC<{ swatch: string; children: React.ReactNode }> = ({
  swatch,
  children,
}) => (
  <span className="flex items-center gap-2">
    <span aria-hidden className={`h-3 w-3 shrink-0 rounded ${swatch}`} />
    {children}
  </span>
);

const KruskalPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges } = useGraphStore();
  const [result, setResult] = useState<KruskalResultData | null>(null);
  const [resultSignature, setResultSignature] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [objective, setObjective] = useState<KruskalObjective>('min');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const displayName = (nodeId: string): string => {
    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

  const clientCheck = useMemo(
    () => validateKruskalInput(nodes, edges),
    [nodes, edges]
  );

  /**
   * Firma de la entrada: grafo (topología y pesos) + objetivo. Cambia
   * cualquiera de los dos y el resultado se oculta solo (mismo patrón
   * que Dijkstra/Johnson).
   */
  const graphSignature = useMemo(
    () =>
      JSON.stringify({
        nodes: nodes.map((node) => node.id),
        edges: edges.map((edge) => [
          edge.source,
          edge.target,
          edge.data?.weight ?? null,
        ]),
        objective,
      }),
    [nodes, edges, objective]
  );

  const freshResult =
    result !== null && resultSignature === graphSignature ? result : null;

  // Memoizado: `freshResult?.steps ?? []` crearía un array nuevo en cada
  // render cuando no hay resultado, y eso re-dispararía los hooks que
  // dependen de steps.
  const steps = useMemo(() => freshResult?.steps ?? [], [freshResult]);
  const currentStep = steps[stepIndex] ?? null;

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
      const payload = buildKruskalPayload(nodes, edges, objective);
      const next = await GraphServiceAPI.runKruskal(payload, controller.signal);
      setResult(next);
      setResultSignature(graphSignature);
      // Se arranca en el último paso (resultado completo); el
      // deslizador permite volver a recorrer el proceso.
      setStepIndex(Math.max(next.steps.length - 1, 0));
    } catch (error: unknown) {
      if (!isCanceled(error)) {
        setErrorMessage(extractApiErrorMessage(error, 'No se pudo calcular Kruskal.'));
        setResult(null);
        setResultSignature(null);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  /** Decisión de cada arista procesada hasta el paso mostrado. */
  const decisions = useMemo(() => {
    const map = new Map<string, 'accepted' | 'rejected'>();
    for (let index = 0; index <= stepIndex && index < steps.length; index += 1) {
      map.set(steps[index].edge.id, steps[index].decision);
    }
    return map;
  }, [steps, stepIndex]);

  /** Componente al que pertenece cada nodo en el paso mostrado. */
  const componentOfNode = useMemo(() => {
    const map = new Map<string, number>();
    currentStep?.components_snapshot.forEach((component, index) => {
      component.forEach((nodeId) => map.set(nodeId, index));
    });
    return map;
  }, [currentStep]);

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-ink">
        <p className="eyebrow">Nivel 07 · árbol de expansión</p>
        <h1 className="mt-3 font-display text-2xl font-bold">No hay un grafo cargado</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Carga o crea una constelación en el editor y vuelve a Kruskal.
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
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">spanning tree / 07</span>
        </div>

        <header className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Nivel 07 · árbol de expansión</p>
              <h1 className="mt-2 font-display text-2xl font-extrabold">Kruskal</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                Construye el árbol que conecta todos los nodos con el menor peso total
                posible. Ordena las aristas y acepta cada una si une componentes
                distintos; se descartan las que formarían un ciclo. La dirección de las
                aristas se ignora.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <label className="text-sm text-ink-muted">
                Objetivo
                <select
                  aria-label="Objetivo"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value as KruskalObjective)}
                  className={`mt-1 ${FIELD}`}
                >
                  {OBJECTIVES.map((item) => (
                    <option key={item.id} value={item.id}>
                      Árbol {item.id === 'min' ? 'de peso MÍNIMO' : 'de peso MÁXIMO'}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                onClick={run}
                loading={loading}
                size="md"
                leftIcon={<Network aria-hidden className="h-4 w-4" />}
              >
                {loading ? 'Calculando…' : 'Calcular árbol'}
              </Button>
            </div>
          </div>

          {clientCheck.hasDirectedEdges && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-300/25 bg-sky-300/[0.08] px-3 py-2 text-sm text-sky-200">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Kruskal ignora la dirección de las aristas: el grafo se trata como no dirigido.
            </p>
          )}

          {clientCheck.unusualWeightEdgeIds.length > 0 && (
            <p className="mt-2 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink-muted">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Hay aristas con peso cero o negativo ({clientCheck.unusualWeightEdgeIds.join(', ')}):
              Kruskal los admite, pero conviene revisarlos.
            </p>
          )}

          {errorMessage && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
              {errorMessage}
            </div>
          )}

          {freshResult && freshResult.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {freshResult.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-xs text-amber-200">
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          )}
        </header>

        {freshResult && (
          <section className="glass-panel animate-in fade-in slide-in-from-top-2 rounded-2xl border-emerald-300/25 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.06] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  {freshResult.is_connected ? 'árbol de expansión' : 'bosque de expansión'}
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">
                  Peso total: {freshResult.total_weight}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-200">
                  {freshResult.mst_edges.length} {freshResult.mst_edges.length === 1 ? 'arista aceptada' : 'aristas aceptadas'}
                </span>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-200">
                  {freshResult.components} {freshResult.components === 1 ? 'componente' : 'componentes'}
                </span>
              </div>
            </div>

            {!freshResult.is_connected && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-200">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                El grafo es desconexo: el resultado es un bosque de expansión con{' '}
                {freshResult.components} componentes (un árbol por componente), no un único árbol.
              </p>
            )}

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
                  ariaLabel="Grafo de solo lectura con las aristas del árbol resaltadas"
                  className="h-80 w-full"
                  nodeStyle={(nodeId) => {
                    const component = componentOfNode.get(nodeId);
                    return {
                      fillClass:
                        component === undefined
                          ? 'fill-slate-600'
                          : COMPONENT_FILLS[component % COMPONENT_FILLS.length],
                    };
                  }}
                  edgeStyle={(edgeId) => {
                    const decision = decisions.get(edgeId);
                    if (decision === 'accepted') {
                      return { strokeClass: ACCEPTED_EDGE, width: 3 };
                    }
                    if (decision === 'rejected') {
                      return { strokeClass: REJECTED_EDGE, width: 2, dashed: true };
                    }
                    return { strokeClass: PLAIN_EDGE, width: 1.5 };
                  }}
                  nodeBadge={(nodeId) => {
                    const component = componentOfNode.get(nodeId);
                    return component === undefined ? null : `c${component + 1}`;
                  }}
                />

                <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
                  <LegendItem swatch="bg-emerald-300">aceptada (en el árbol)</LegendItem>
                  <LegendItem swatch="bg-rose-400">rechazada</LegendItem>
                  <LegendItem swatch="bg-white/25">pendiente</LegendItem>
                  <LegendItem swatch="bg-violet-300">color por componente</LegendItem>
                </p>

                {steps.length > 0 && currentStep && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className={STEP_TAG}>paso a paso</p>
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-200">
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

                    <div
                      className={`mt-4 rounded-xl border p-4 text-sm ${
                        currentStep.decision === 'accepted'
                          ? 'border-emerald-300/25 bg-emerald-300/[0.06]'
                          : 'border-rose-400/25 bg-rose-500/[0.06]'
                      }`}
                    >
                      <p className="text-ink">
                        Arista{' '}
                        <strong className="font-mono">
                          {displayName(currentStep.edge.source)} — {displayName(currentStep.edge.target)}
                        </strong>{' '}
                        (peso {currentStep.edge.weight}):{' '}
                        {currentStep.decision === 'accepted' ? (
                          <span className="font-bold text-emerald-200">ACEPTADA</span>
                        ) : (
                          <span className="font-bold text-rose-200">RECHAZADA</span>
                        )}
                        {' — '}
                        {currentStep.reason}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-ink-subtle">
                        Peso acumulado: {currentStep.total_weight_so_far} · Componentes:{' '}
                        {currentStep.components_snapshot.length}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-subtle">
                        {currentStep.components_snapshot
                          .map(
                            (component, index) =>
                              `c${index + 1}: ${component.map(displayName).join(', ')}`
                          )
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/[0.05] p-4">
                  <h2 className="font-display text-base font-bold text-ink">
                    {freshResult.is_connected ? 'Árbol resultante' : 'Bosque resultante'}
                  </h2>
                  {freshResult.mst_edges.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {freshResult.mst_edges.map((edge) => (
                        <li
                          key={edge.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5"
                        >
                          <span className="text-ink">
                            {displayName(edge.source)} — {displayName(edge.target)}
                          </span>
                          <span className="font-mono text-xs font-semibold text-emerald-200">
                            {edge.weight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-ink-muted">
                      Sin aristas aceptadas: no hay conexiones que unir.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h2 className="font-display text-base font-bold text-ink">
                    Aristas en orden de procesamiento
                  </h2>
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    Se muestran todas, aceptadas y rechazadas, con su motivo.
                  </p>
                  <ol className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {steps.map((step, index) => (
                      <li
                        key={step.edge.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          index === stepIndex
                            ? 'border-brand/50 bg-brand/10'
                            : step.decision === 'accepted'
                              ? 'border-emerald-300/20 bg-emerald-300/[0.05]'
                              : 'border-white/10 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-ink">
                            {step.step}. {displayName(step.edge.source)} — {displayName(step.edge.target)} ({step.edge.weight})
                          </span>
                          {step.decision === 'accepted' ? (
                            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-200">
                              aceptada
                            </span>
                          ) : (
                            <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-200">
                              rechazada
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{step.reason}</p>
                      </li>
                    ))}
                  </ol>
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

export default KruskalPage;
