import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import type { NorthwestResult } from '../types/graph';
import { extractApiErrorMessage } from '../utils/apiError';
import { translateGraphToNorthwest } from '../utils/graphToNorthwest';
import { saveProjectGraph } from '../utils/projectStorage';

const MAX_DIMENSION = 20;

const NorthwestPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges, updateNodeData } = useGraphStore();
  const [result, setResult] = useState<NorthwestResult | null>(null);
  const [resultSignature, setResultSignature] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
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
      setResult(next);
      setResultSignature(signature);
      setStepIndex(0);
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
        <h1 className="font-display text-2xl font-bold">No hay un grafo cargado</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Carga o crea una constelación en el editor y vuelve a Esquina Noroeste.
        </p>
        <div className="mt-5 flex gap-3">
          <Link className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" to="/editor">Abrir editor</Link>
          <Link className="rounded-lg border border-white/15 px-4 py-2 text-sm" to="/dashboard">Ver proyectos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="min-w-0 flex-1 overflow-auto p-5">
        <div className="mb-5 flex items-center justify-between">
          <BackButton to={returnTo} />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">Transporte · esquina noroeste</span>
        </div>
        <header className="glass-panel rounded-2xl p-5">
          <p className="eyebrow">Problema de transporte</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold">Método de la esquina noroeste</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Construye una solución inicial según la posición de las celdas; no optimiza el costo.
            Las rutas ausentes están bloqueadas y nunca equivalen a costo cero.
          </p>
        </header>

        <section className="glass-panel mt-4 rounded-2xl p-5">
          <h2 className="font-bold">Roles, ofertas y demandas</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={node.id}>
                <strong className="text-sm">{node.data?.label || node.id}</strong>
                <select
                  aria-label={`Rol de ${node.data?.label || node.id}`}
                  className="mt-2 w-full rounded-lg bg-[#0b1328] p-2 text-sm"
                  value={translation.roles[node.id] ?? 'none'}
                  onChange={(event) => persistNodeData(node.id, { role: event.target.value as 'source' | 'sink' | 'none' })}
                >
                  <option value="source">Origen</option>
                  <option value="sink">Destino</option>
                  <option value="none">No participa</option>
                </select>
                {translation.roles[node.id] === 'source' && (
                  <label className="mt-2 block text-xs text-ink-muted">Oferta
                    <input aria-label={`Oferta de ${node.data?.label || node.id}`} type="number" min="0" step="any"
                      className="mt-1 w-full rounded-lg bg-[#0b1328] p-2 text-sm text-ink"
                      value={node.data?.supply ?? 0} onChange={(event) => updateAmount(node.id, 'supply', event.target.value)} />
                  </label>
                )}
                {translation.roles[node.id] === 'sink' && (
                  <label className="mt-2 block text-xs text-ink-muted">Demanda
                    <input aria-label={`Demanda de ${node.data?.label || node.id}`} type="number" min="0" step="any"
                      className="mt-1 w-full rounded-lg bg-[#0b1328] p-2 text-sm text-ink"
                      value={node.data?.demand ?? 0} onChange={(event) => updateAmount(node.id, 'demand', event.target.value)} />
                  </label>
                )}
              </div>
            ))}
          </div>
          {translation.warnings.map((warning) => <p className="mt-3 text-sm text-amber-300" key={warning}>{warning}</p>)}
        </section>

        <section className="glass-panel mt-4 overflow-auto rounded-2xl p-5">
          <h2 className="mb-3 font-bold">Matriz de costos unitarios</h2>
          {translation.origins.length > 0 && translation.destinations.length > 0 ? (
            <table className="min-w-full border-collapse text-center text-sm">
              <thead><tr><th className="p-2 text-left">Origen / Destino</th>
                {translation.destinations.map((destination) => <th className="p-2" key={destination.id}>{destination.label}<br /><span className="text-xs text-ink-subtle">demanda {destination.demand}</span></th>)}
              </tr></thead>
              <tbody>{translation.origins.map((origin, row) => (
                <tr key={origin.id}><th className="border-t border-white/10 p-2 text-left">{origin.label}<br /><span className="text-xs text-ink-subtle">oferta {origin.supply}</span></th>
                  {translation.costs[row].map((cost, col) => <td key={`${origin.id}-${translation.destinations[col].id}`} className={`border-t border-white/10 p-3 ${cost === null ? 'bg-slate-700/60 text-ink-subtle' : ''}`}>{cost === null ? '—' : cost}</td>)}
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-amber-300">Selecciona al menos un origen y un destino.</p>}
        </section>

        {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">{errorMessage}</p>}
        <button type="button" disabled={loading} onClick={run} className="mt-4 rounded-xl bg-brand px-5 py-3 font-bold text-white disabled:opacity-50">
          {loading ? 'Calculando…' : 'Calcular solución inicial'}
        </button>

        {freshResult && (
          <section className="glass-panel mt-4 rounded-2xl p-5">
            {!freshResult.was_balanced && freshResult.dummy && <p className="mb-3 rounded-lg bg-white/5 p-3 text-sm text-ink-muted">
              Se añadió {freshResult.dummy.type === 'origin' ? 'un origen' : 'un destino'} ficticio
              ({freshResult.dummy.quantity}) para balancear oferta y demanda.
            </p>}
            {freshResult.uses_blocked_routes && <p role="alert" className="mb-3 rounded-lg border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">
              NO FACTIBLE: la solución asigna cantidad a una o más rutas bloqueadas.
            </p>}
            <p className="font-bold">Costo total:{freshResult.total_cost === null ? '' : ` ${freshResult.total_cost}`}</p>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full border-collapse text-center text-sm">
                <thead><tr><th className="p-2">Asignación</th>{outputDestinations.map((name, col) => <th className={`p-2 ${freshResult.dummy?.type === 'destination' && col === freshResult.dummy.index ? 'opacity-50' : ''}`} key={`${name}-${col}`}>{name}</th>)}</tr></thead>
                <tbody>{freshResult.allocation.map((row, rowIndex) => <tr key={rowIndex}>
                  <th className={`border-t border-white/10 p-2 ${freshResult.dummy?.type === 'origin' && rowIndex === freshResult.dummy.index ? 'opacity-50' : ''}`}>{outputOrigins[rowIndex]}</th>
                  {row.map((quantity, colIndex) => {
                    const key = `${rowIndex},${colIndex}`;
                    const basic = basicCells.has(key);
                    const degenerate = basic && basicCells.get(key) === 0;
                    const blocked = rowIndex < translation.costs.length &&
                      colIndex < (translation.costs[rowIndex]?.length ?? 0) &&
                      translation.costs[rowIndex][colIndex] === null;
                    return <td key={key} className={`border-t border-white/10 p-3 ${blocked ? 'bg-slate-700/60 text-ink-subtle' : basic ? degenerate ? 'bg-amber-400/20 ring-1 ring-amber-300' : 'bg-emerald-400/20 ring-1 ring-emerald-300' : ''}`}>{blocked ? '—' : quantity}</td>;
                  })}
                </tr>)}</tbody>
              </table>
            </div>
            {currentStep && <div className="mt-5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Anterior</button>
                <p className="text-center text-sm">Paso {currentStep.step} de {freshResult.steps.length}</p>
                <button type="button" disabled={stepIndex >= freshResult.steps.length - 1} onClick={() => setStepIndex((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Siguiente</button>
              </div>
              <input aria-label="Paso actual" className="mt-3 w-full accent-brand" type="range" min="0" max={freshResult.steps.length - 1} value={stepIndex} onChange={(event) => setStepIndex(Number(event.target.value))} />
              <p className="mt-2 text-sm text-ink-muted">{currentStep.note} Celda [{currentStep.cell[0] + 1}, {currentStep.cell[1] + 1}], cantidad {currentStep.quantity}; se cierra {currentStep.closed === 'both' ? 'fila y columna' : currentStep.closed === 'row' ? 'fila' : 'columna'}.</p>
              {currentStep.degenerate && <p className="mt-1 text-sm text-amber-300">Degeneración: se añade una celda básica con asignación cero.</p>}
              <p className="mt-1 text-xs text-ink-subtle">Oferta restante: {currentStep.supply_remaining.join(', ')} · Demanda restante: {currentStep.demand_remaining.join(', ')}</p>
            </div>}
          </section>
        )}
      </main>
      <Sidebar />
    </div>
  );
};

export default NorthwestPage;
