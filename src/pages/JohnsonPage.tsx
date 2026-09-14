import React, { useEffect, useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { GraphServiceAPI } from '../services/api';
import { buildGraphPayload } from '../utils/graphFile';
import type { JohnsonResultData } from '../types/graph';

const JohnsonPage: React.FC = () => {
  const { nodes, edges, updateNodeData } = useGraphStore();
  const [result, setResult] = useState<JohnsonResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [renames, setRenames] = useState<Record<string, string>>({});

  const nodeList = useMemo(() => nodes.map((node) => node.id), [nodes]);

  const displayName = (nodeId: string): string => {
    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

  useEffect(() => {
    const nextRenames = Object.fromEntries(
      nodes.map((node) => [node.id, node.data?.label?.trim() || node.id])
    );
    setRenames(nextRenames);
    if (nodeList.length > 0 && !source) setSource(nodeList[0]);
    if (nodeList.length > 1 && !target) setTarget(nodeList[1]);
  }, [nodes, nodeList, source, target]);

  const hasUnnamedNodes = nodes.some(
    (node) => !node.data?.label || node.data.label.trim() === '' || node.data.label === node.id
  );

  const handleRenameNode = (nodeId: string, nextLabel: string) => {
    const trimmed = nextLabel.trim();
    if (!trimmed) return;
    updateNodeData(nodeId, trimmed);
    setRenames((current) => ({ ...current, [nodeId]: trimmed }));
  };

  const runJohnson = async () => {
    if (nodeList.length === 0) {
      setErrorMessage('Añade nodos al grafo antes de ejecutar Johnson.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = buildGraphPayload(nodes, edges);
      const response = await GraphServiceAPI.runJohnson(payload);
      setResult(response);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'No se pudo calcular Johnson.')
          : 'No se pudo calcular Johnson.';
      setErrorMessage(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedPath = result && source && target ? result.paths?.[source]?.[target] ?? [] : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Algoritmo de Johnson</h1>
            <p className="mt-1 text-sm text-slate-500">Calcula caminos mínimos entre todos los pares de nodos en un grafo dirigido.</p>
          </div>

          <button
            type="button"
            onClick={runJohnson}
            disabled={loading || nodeList.length === 0}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Calculando…' : 'Ejecutar Johnson'}
          </button>
        </div>

        {hasUnnamedNodes && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Antes de continuar, cambia los nombres visibles de los nodos.</p>
            <p className="mt-1 text-xs text-amber-700">Johnson mostrará estos nombres en la tabla y en el camino, no los IDs internos.</p>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {nodes.map((node) => (
                <label key={node.id} className="text-xs font-medium text-amber-800">
                  {node.id}
                  <input
                    value={renames[node.id] ?? node.id}
                    onChange={(e) => setRenames((current) => ({ ...current, [node.id]: e.target.value }))}
                    onBlur={() => handleRenameNode(node.id, renames[node.id] ?? node.id)}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm text-slate-700"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {result && result.has_negative_cycle && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{result.message ?? 'El grafo contiene un ciclo de peso negativo.'}</div>
        )}

        {nodeList.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Origen
              <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2">
                {nodeList.map((nodeId) => (
                  <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600">
              Destino
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2">
                {nodeList.map((nodeId) => (
                  <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {result && !result.has_negative_cycle && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">Origen</th>
                    {nodeList.map((nodeId) => (
                      <th key={nodeId} className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">{displayName(nodeId)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodeList.map((sourceId) => (
                    <tr key={sourceId}>
                      <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">{displayName(sourceId)}</td>
                      {nodeList.map((targetId) => {
                        const distance = result.distances[sourceId]?.[targetId];
                        return (
                          <td key={`${sourceId}-${targetId}`} className="border-b border-slate-200 px-3 py-2 text-slate-600">
                            {distance === null || distance === undefined ? '∞' : distance}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">Camino seleccionado</h2>
            <p className="mt-2 text-sm text-slate-500">{displayName(source)} → {displayName(target)}</p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {selectedPath.length > 0 ? selectedPath.map((nodeId) => displayName(nodeId)).join(' → ') : 'No hay camino válido entre estos nodos.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JohnsonPage;