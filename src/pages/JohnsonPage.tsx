import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { JohnsonResultView } from '../components/JohnsonResultView';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import {
  buildJohnsonGraphSignature,
  getJohnsonPath,
  useJohnsonResult,
} from '../store/useJohnsonResult';
import { extractApiErrorMessage } from '../utils/apiError';
import { buildGraphPayload } from '../utils/graphFile';

const JohnsonPage: React.FC = () => {
  const { nodes, edges, updateNodeData } = useGraphStore();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const {
    result,
    graphSignature: resultGraphSignature,
    source: storedSource,
    target: storedTarget,
    setJohnsonResult,
    setJohnsonEndpoints,
    clearJohnsonResult,
  } = useJohnsonResult();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renames, setRenames] = useState<Record<string, string>>({});

  const nodeList = useMemo(() => nodes.map((node) => node.id), [nodes]);

  const displayName = (nodeId: string): string => {
    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

  /**
   * Firma del grafo tal como lo recibio Johnson. Solo importa la
   * topologia y los pesos: renombrar un nodo no cambia las distancias.
   */
  const graphSignature = useMemo(
    () => buildJohnsonGraphSignature(nodes, edges),
    [nodes, edges]
  );

  /**
   * Si editas el grafo con un resultado en pantalla, la tabla de
   * distancias y la ruta mostrada quedan obsoletas. Con esta firma el
   * resultado se oculta solo en vez de depender de que cada mutacion
   * se acuerde de limpiarlo.
   */
  const freshResult =
    result !== null && resultGraphSignature === graphSignature
      ? result
      : null;

  /**
   * Origen/destino: guardamos solo lo que el usuario eligio. El default
   * se deriva de la lista de nodos, asi que no hace falta un efecto que
   * lo sincronice. De paso, si borras el nodo que habias elegido, el
   * override deja de ser valido y vuelve al primer nodo disponible en
   * lugar de dejar el select apuntando a algo inexistente.
   */
  const source =
    storedSource && nodeList.includes(storedSource)
      ? storedSource
      : (nodeList[0] ?? '');
  const target =
    storedTarget && nodeList.includes(storedTarget)
      ? storedTarget
      : (nodeList[1] ?? nodeList[0] ?? '');

  /**
   * `renames` NO es un espejo del store: es solo lo que el usuario
   * todavia no confirmo con blur. Lo que nunca se toco se lee del
   * store. Asi no hace falta un useEffect que resincronice y que de y
   * paso borraba lo que el usuario estaba escribiendo.
   */
  const renameValue = (nodeId: string): string => {
    const override = renames[nodeId];
    if (override !== undefined) return override;

    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

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
      // El resultado vive en el store para no perderse al salir de esta
      // pagina. Despues de calcular vamos a la pizarra de origen: el
      // camino queda resaltado y el panel flotante conserva lo actual.
      setJohnsonResult(response, graphSignature, source, target);
      navigate(returnTo);
    } catch (err: unknown) {
      // Mismo util que el resto de la app: antes esto era una tercera
      // variante del parseo de errores, que solo miraba `.message`.
      const message = extractApiErrorMessage(
        err,
        'No se pudo calcular Johnson.'
      );
      setErrorMessage(message);
      clearJohnsonResult();
    } finally {
      setLoading(false);
    }
  };

  const selectedPath = getJohnsonPath(freshResult, source, target);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton to={returnTo} />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">algoritmo</span>
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Camino mínimo</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">JOHNSON</h1>
            <p className="mt-1 text-sm text-ink-muted">Calcula todos contra todos en un grafo dirigido. Al calcular vas a la pizarra: el camino queda resaltado y el resultado queda flotando abajo.</p>
          </div>

          <button
            type="button"
            onClick={runJohnson}
            disabled={loading || nodeList.length === 0}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Calculando…' : 'Calcular'}
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
                    value={renameValue(node.id)}
                    onChange={(e) => setRenames((current) => ({ ...current, [node.id]: e.target.value }))}
                    onBlur={() => handleRenameNode(node.id, renameValue(node.id))}
                    className="mt-1 w-full rounded-lg border border-[#ffd684]/30 bg-[#211d24] p-2 text-sm text-ink"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {nodeList.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-ink-muted">
              Origen
              <select value={source} onChange={(e) => setJohnsonEndpoints(e.target.value, target)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink">
                {nodeList.map((nodeId) => (
                  <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-ink-muted">
              Destino
              <select value={target} onChange={(e) => setJohnsonEndpoints(source, e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1328] p-2 text-ink">
                {nodeList.map((nodeId) => (
                  <option key={nodeId} value={nodeId}>{displayName(nodeId)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {freshResult && (
        <JohnsonResultView
          result={freshResult}
          nodeIds={nodeList}
          source={source}
          target={target}
          getLabel={displayName}
          selectedPath={selectedPath}
        />
      )}
      </main>
      <aside className="h-full shrink-0" aria-label="Panel de propiedades y herramientas">
        <Sidebar />
      </aside>
    </div>
  );
};

export default JohnsonPage;