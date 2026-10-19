import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, PackageCheck, Truck } from 'lucide-react';
import { AlgorithmHelp } from '../components/AlgorithmHelp';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import { useNorthwestStore } from '../store/useNorthwestStore';
import { Button } from '../ui/Button';
import { extractApiErrorMessage } from '../utils/apiError';
import { translateGraphToNorthwest } from '../utils/graphToNorthwest';
import { saveProjectGraph } from '../utils/projectStorage';

const MAX_DIMENSION = 20;

/** Un solo look para todos los campos editables de la pantalla. */
const FIELD =
  'w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/15';

/** Rotulo pequeño que jerarquiza los cabecillos de cada seccion. */
const STEP_TAG =
  'font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300/80';

type Role = 'source' | 'sink' | 'none';

/** Cada rol se lee de un vistazo: no hace falta abrir el select para saber quien es quien. */
const ROLE_META: Record<Role, { card: string; chip: string; tag: string; icon: React.ReactNode }> = {
  source: {
    card: 'border-brand/35 bg-brand/[0.06]',
    chip: 'border-brand/40 bg-brand/10 text-brand',
    tag: 'Origen',
    icon: <Truck aria-hidden className="h-4 w-4 shrink-0" />,
  },
  sink: {
    card: 'border-amber-300/35 bg-amber-300/[0.06]',
    chip: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
    tag: 'Destino',
    icon: <PackageCheck aria-hidden className="h-4 w-4 shrink-0" />,
  },
  none: {
    card: 'border-white/10 bg-white/[0.03]',
    chip: 'border-white/15 bg-white/[0.05] text-ink-subtle',
    tag: 'No participa',
    icon: null,
  },
};

const LegendItem: React.FC<{ swatch: string; children: React.ReactNode }> = ({
  swatch,
  children,
}) => (
  <span className="flex items-center gap-2">
    <span aria-hidden className={`h-3 w-3 shrink-0 rounded ${swatch}`} />
    {children}
  </span>
);

const NorthwestPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges, updateNodeData } = useGraphStore();
  const { result, resultSignature, stepIndex, setResult, setStepIndex } =
    useNorthwestStore();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const translation = useMemo(
    () =>
      translateGraphToNorthwest(
        nodes.map((node) => ({
          id: node.id,
          label: node.data?.label,
          data: node.data,
        })),
        edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          weight: edge.data?.weight,
          isDirected: edge.data?.is_directed,
        }))
      ),
    [nodes, edges]
  );

  const signature = JSON.stringify({
    nodes: nodes.map(({ id, data }) => [id, data?.role, data?.supply, data?.demand]),
    edges: edges.map(({ source, target, data }) => [source, target, data?.weight, data?.is_directed]),
  });
  const freshResult = result && resultSignature === signature ? result : null;
  const totalSupply = translation.origins.reduce((sum, origin) => sum + origin.supply, 0);
  const totalDemand = translation.destinations.reduce((sum, destination) => sum + destination.demand, 0);
  const dimensionsValid =
    translation.origins.length > 0 &&
    translation.destinations.length > 0 &&
    translation.origins.length <= MAX_DIMENSION &&
    translation.destinations.length <= MAX_DIMENSION;

  const persistNodeData = (nodeId: string, patch: { role?: 'source' | 'sink' | 'none'; supply?: number; demand?: number }) => {
    const updatedNodes = nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node
    );
    const projectId = returnTo.match(/^\/galaxy\/([^/]+)/)?.[1];
    if (projectId && !saveProjectGraph(decodeURIComponent(projectId), updatedNodes, edges)) {
      setErrorMessage('No se encontró el proyecto de destino; los datos no se guardaron.');
      return;
    }
    setErrorMessage(null);
    updateNodeData(nodeId, patch);
  };

  const updateAmount = (nodeId: string, field: 'supply' | 'demand', value: string) => {
    const amount = value === '' ? 0 : Number(value);
    persistNodeData(nodeId, { [field]: Number.isFinite(amount) ? amount : 0 });
  };

  const run = async () => {
    if (!dimensionsValid) {
      setErrorMessage(`Se requiere al menos un origen y un destino; el máximo es ${MAX_DIMENSION}×${MAX_DIMENSION}.`);
      return;
    }
    const amounts = [
      ...translation.origins.map((item) => item.supply),
      ...translation.destinations.map((item) => item.demand),
    ];
    if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
      setErrorMessage('Las ofertas y demandas deben ser números finitos no negativos.');
      return;
    }
    if (totalSupply <= 0 || totalDemand <= 0) {
      setErrorMessage('La oferta total y la demanda total deben ser mayores que cero.');
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await GraphServiceAPI.runNorthwest(
        {
          costs: translation.costs,
          supply: translation.origins.map((item) => item.supply),
          demand: translation.destinations.map((item) => item.demand),
          row_labels: translation.origins.map((item) => item.label),
          col_labels: translation.destinations.map((item) => item.label),
        },
        controller.signal
      );
      setResult(next, signature);
    } catch (error: unknown) {
      if (!isCanceled(error)) {
        setErrorMessage(extractApiErrorMessage(error, 'No se pudo ejecutar Esquina Noroeste.'));
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  const currentStep = freshResult?.steps[stepIndex] ?? null;
  const outputOrigins = [...translation.origins.map((item) => item.label)];
  const outputDestinations = [...translation.destinations.map((item) => item.label)];
  if (freshResult?.dummy?.type === 'origin') outputOrigins.push('Origen ficticio');
  if (freshResult?.dummy?.type === 'destination') outputDestinations.push('Destino ficticio');
  const basicCells = new Map(
    (freshResult?.basic_cells ?? []).map(({ cell, quantity }) => [`${cell[0]},${cell[1]}`, quantity])
  );

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-ink">
        <p className="eyebrow">Nivel 03 · rutas de suministro</p>
        <h1 className="mt-3 font-display text-2xl font-bold">No hay un grafo cargado</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Carga o crea una constelación en el editor y vuelve a Esquina Noroeste.
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
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">supply routes / 03</span>
        </div>

        <header className="glass-panel rise-in rounded-2xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Nivel 03 · rutas de suministro</p>
              <h1 className="mt-2 font-display text-2xl font-extrabold">Método de la esquina noroeste</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                Construye una solución inicial según la posición de las celdas; no optimiza el costo.
                Las rutas ausentes están bloqueadas y nunca equivalen a costo cero.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-[11px] text-brand">
                  oferta {totalSupply}
                </span>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-mono text-[11px] text-amber-200">
                  demanda {totalDemand}
                </span>
                <span
                  className={
                    totalSupply === totalDemand
                      ? 'rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] text-emerald-200'
                      : 'rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 font-mono text-[11px] text-amber-200'
                  }
                >
                  {totalSupply === totalDemand
                    ? 'balanceado'
                    : 'se usa fila/columna ficticia'}
                </span>
              </div>

              <Button onClick={run} loading={loading} size="md">
                {loading ? 'Calculando…' : 'Calcular solución inicial'}
              </Button>
            </div>
          </div>

          {!dimensionsValid && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-200">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Se requiere al menos un origen y un destino; el máximo es {MAX_DIMENSION}×{MAX_DIMENSION}.
            </p>
          )}

          {errorMessage && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
              {errorMessage}
            </div>
          )}
        </header>

        <AlgorithmHelp
          title="Cómo funciona la esquina noroeste"
          summary="Construye una solución inicial de transporte desde la celda superior izquierda. No optimiza el costo."
          items={[
            'Asigná roles de origen y destino y completá sus ofertas y demandas; los roles también se pueden inferir de las aristas.',
            'En cada paso se asigna el mínimo entre la oferta y la demanda restantes, y se avanza al cerrar una fila o una columna.',
            'Si los totales no coinciden, se agrega un origen o destino ficticio de costo cero (dummy).',
            'Una celda sin arista es una ruta bloqueada (—), no un costo cero. Si recibe cantidad, el resultado se marca NO FACTIBLE.',
            'Si la oferta y la demanda se agotan a la vez, se marca una celda básica degenerada con asignación cero.',
          ]}
        />

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={STEP_TAG}>paso 01</p>
              <h2 className="mt-1 font-display text-lg font-bold">Roles, ofertas y demandas</h2>
            </div>
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-ink-muted">
              {translation.origins.length} {translation.origins.length === 1 ? 'origen' : 'orígenes'} ·{' '}
              {translation.destinations.length} {translation.destinations.length === 1 ? 'destino' : 'destinos'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => {
              const role = (translation.roles[node.id] ?? 'none') as Role;
              const meta = ROLE_META[role];
              return (
                <div className={`rounded-xl border p-3 transition ${meta.card}`} key={node.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex min-w-0 items-center gap-2 ${role === 'none' ? 'text-ink-muted' : 'text-ink'}`}>
                      {meta.icon}
                      <strong className="truncate text-sm">{node.data?.label || node.id}</strong>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${meta.chip}`}>
                      {meta.tag}
                    </span>
                  </div>
                  <select
                    aria-label={`Rol de ${node.data?.label || node.id}`}
                    className={`mt-3 ${FIELD}`}
                    value={role}
                    onChange={(event) => persistNodeData(node.id, { role: event.target.value as 'source' | 'sink' | 'none' })}
                  >
                    <option value="source">Origen</option>
                    <option value="sink">Destino</option>
                    <option value="none">No participa</option>
                  </select>
                  {role === 'source' && (
                    <label className="mt-2 block text-xs text-ink-muted">Oferta
                      <input aria-label={`Oferta de ${node.data?.label || node.id}`} type="number" min="0" step="any"
                        className={`mt-1 font-mono tabular-nums ${FIELD}`}
                        value={node.data?.supply ?? 0} onChange={(event) => updateAmount(node.id, 'supply', event.target.value)} />
                    </label>
                  )}
                  {role === 'sink' && (
                    <label className="mt-2 block text-xs text-ink-muted">Demanda
                      <input aria-label={`Demanda de ${node.data?.label || node.id}`} type="number" min="0" step="any"
                        className={`mt-1 font-mono tabular-nums ${FIELD}`}
                        value={node.data?.demand ?? 0} onChange={(event) => updateAmount(node.id, 'demand', event.target.value)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {translation.warnings.map((warning) => (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-200" key={warning}>
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {warning}
            </p>
          ))}
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={STEP_TAG}>paso 02</p>
              <h2 className="mt-1 font-display text-lg font-bold">Matriz de costos unitarios</h2>
            </div>
            <span className="font-mono text-[11px] text-ink-subtle">
              {translation.origins.length} × {translation.destinations.length}
            </span>
          </div>

          {translation.origins.length > 0 && translation.destinations.length > 0 ? (
            <>
              <div className="mt-4 max-h-[26rem] overflow-auto rounded-xl border border-white/10 bg-[#0b1328]/50">
                <table className="min-w-full border-separate border-spacing-0 text-center text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-20 border-b border-r border-white/10 bg-[#101a31] p-2 text-left text-xs font-semibold text-ink-muted">
                        Origen / Destino
                      </th>
                      {translation.destinations.map((destination) => (
                        <th className="sticky top-0 z-10 border-b border-white/10 bg-[#101a31] p-2 text-xs font-semibold text-emerald-200" key={destination.id}>
                          <span className="block truncate">{destination.label}</span>
                          <span className="block font-mono text-[10px] font-normal text-ink-subtle">demanda {destination.demand}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {translation.origins.map((origin, row) => (
                      <tr key={origin.id}>
                        <th className="sticky left-0 z-10 border-b border-r border-white/10 bg-[#101a31] p-2 text-left text-xs font-semibold text-ink-muted">
                          <span className="block truncate">{origin.label}</span>
                          <span className="block font-mono text-[10px] font-normal text-ink-subtle">oferta {origin.supply}</span>
                        </th>
                        {translation.costs[row].map((cost, col) => (
                          <td
                            key={`${origin.id}-${translation.destinations[col].id}`}
                            className={`border-b border-white/10 p-3 font-mono tabular-nums ${
                              cost === null ? 'bg-slate-700/60 text-ink-subtle' : 'text-ink'
                            }`}
                          >
                            {cost === null ? '—' : cost}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
                <LegendItem swatch="bg-slate-700/60">ruta bloqueada</LegendItem>
                <LegendItem swatch="bg-white/10">costo disponible</LegendItem>
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-amber-300">Selecciona al menos un origen y un destino.</p>
          )}
        </section>

        {freshResult && (
          <section className="glass-panel animate-in fade-in slide-in-from-top-2 rounded-2xl border-emerald-300/25 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.06] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  solución inicial
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">Costo total:{freshResult.total_cost === null ? '' : ` ${freshResult.total_cost}`}</p>
              </div>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-200">
                {basicCells.size} {basicCells.size === 1 ? 'celda básica' : 'celdas básicas'}
              </span>
            </div>

            {!freshResult.was_balanced && freshResult.dummy && (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-ink-muted">
                Se añadió {freshResult.dummy.type === 'origin' ? 'un origen' : 'un destino'} ficticio ({freshResult.dummy.quantity}) para balancear oferta y demanda.
              </p>
            )}
            {freshResult.uses_blocked_routes && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm font-medium text-rose-200">
                NO FACTIBLE: la solución asigna cantidad a una o más rutas bloqueadas.
              </p>
            )}

            <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-[#0b1328]/50">
              <table className="min-w-full border-separate border-spacing-0 text-center text-sm">
                <thead>
                  <tr>
                    <th className="bg-emerald-300/[0.08] p-2 text-xs font-semibold text-emerald-200">Asignación</th>
                    {outputDestinations.map((name, col) => (
                      <th
                        className={`bg-emerald-300/[0.08] p-2 text-xs font-semibold text-emerald-200 ${freshResult.dummy?.type === 'destination' && col === freshResult.dummy.index ? 'opacity-50' : ''}`}
                        key={`${name}-${col}`}
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {freshResult.allocation.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <th className={`border-t border-white/10 p-2 text-left text-xs font-semibold text-ink-muted ${freshResult.dummy?.type === 'origin' && rowIndex === freshResult.dummy.index ? 'opacity-50' : ''}`}>
                        {outputOrigins[rowIndex]}
                      </th>
                      {row.map((quantity, colIndex) => {
                        const key = `${rowIndex},${colIndex}`;
                        const basic = basicCells.has(key);
                        const degenerate = basic && basicCells.get(key) === 0;
                        const blocked = rowIndex < translation.costs.length &&
                          colIndex < (translation.costs[rowIndex]?.length ?? 0) &&
                          translation.costs[rowIndex][colIndex] === null;
                        return (
                          <td
                            key={key}
                            className={`border-t border-white/10 p-3 font-mono tabular-nums ${
                              blocked
                                ? 'bg-slate-700/60 text-ink-subtle'
                                : basic
                                  ? degenerate
                                    ? 'bg-amber-400/20 font-bold text-amber-200 ring-1 ring-amber-300'
                                    : 'bg-emerald-400/20 font-bold text-emerald-100 ring-1 ring-emerald-300'
                                  : 'text-ink'
                            }`}
                          >
                            {blocked ? '—' : quantity}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
              <LegendItem swatch="bg-emerald-400/20 ring-1 ring-emerald-300">celda básica</LegendItem>
              <LegendItem swatch="bg-amber-400/20 ring-1 ring-amber-300">degeneración (cero)</LegendItem>
              <LegendItem swatch="bg-slate-700/60">ruta bloqueada</LegendItem>
            </p>

            {currentStep && (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={STEP_TAG}>paso a paso</p>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-200">
                    Paso {currentStep.step} de {freshResult.steps.length}
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
                    max={freshResult.steps.length - 1}
                    value={stepIndex}
                    onChange={(event) => setStepIndex(Number(event.target.value))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={stepIndex >= freshResult.steps.length - 1}
                    onClick={() => setStepIndex((value) => value + 1)}
                  >
                    Siguiente →
                  </Button>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
                  <p className="text-sm text-ink">
                    {currentStep.note} Celda [{currentStep.cell[0] + 1}, {currentStep.cell[1] + 1}], cantidad {currentStep.quantity}; se cierra {currentStep.closed === 'both' ? 'fila y columna' : currentStep.closed === 'row' ? 'fila' : 'columna'}.
                  </p>
                  {currentStep.degenerate && (
                    <p className="mt-2 w-fit rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                      Degeneración: se añade una celda básica con asignación cero.
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[11px] text-ink-subtle">
                    Oferta restante: {currentStep.supply_remaining.join(', ')} · Demanda restante: {currentStep.demand_remaining.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <aside className="h-full shrink-0" aria-label="Panel de propiedades y herramientas">
        <Sidebar />
      </aside>
    </div>
  );
};

export default NorthwestPage;
