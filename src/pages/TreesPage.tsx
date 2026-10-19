import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import type { TreeBuildResult, TreeData, TreeOrder, TreeTraverseResult } from '../types/graph';
import { extractApiErrorMessage } from '../utils/apiError';
import { layoutTree } from '../utils/treeLayout';
import { treeFromGraph } from '../utils/treeFromGraph';
import { parseTraversalInput } from '../utils/treeTraversalInput';
import { saveProjectGraph } from '../utils/projectStorage';

const MAX_NODES = 31;
const ORDERS: { id: TreeOrder; label: string }[] = [
  { id: 'preorder', label: 'Pre-order' },
  { id: 'inorder', label: 'In-order' },
  { id: 'postorder', label: 'Post-order' },
];

interface TreeView {
  tree: TreeData;
  traversals: Record<TreeOrder, number[]>;
  isBst: boolean;
}

const TreesPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges, replaceGraph, structureLocked } = useGraphStore();
  const [mode, setMode] = useState<'values' | 'random'>('values');
  const [values, setValues] = useState<number[]>([]);
  const [valueInput, setValueInput] = useState('');
  const [countInput, setCountInput] = useState('7');
  const [treeView, setTreeView] = useState<TreeView | null>(null);
  const [reconstructed, setReconstructed] = useState<TreeView | null>(null);
  const [order, setOrder] = useState<TreeOrder>('preorder');
  const [walk, setWalk] = useState<TreeTraverseResult | null>(null);
  const [walkIndex, setWalkIndex] = useState(0);
  const [inorderText, setInorderText] = useState('');
  const [otherText, setOtherText] = useState('');
  const [otherOrder, setOtherOrder] = useState<'preorder' | 'postorder'>('preorder');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reconstructionError, setReconstructionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);

  const activeTree = reconstructed ?? treeView;
  const layout = useMemo(
    () => activeTree ? layoutTree(activeTree.tree) : null,
    [activeTree]
  );
  const currentVisit = walk?.visits[walkIndex] ?? null;
  const nodePositions = useMemo(
    () => new Map(layout?.nodes.map((node) => [node.id, node.position]) ?? []),
    [layout]
  );

  const beginRequest = (): AbortController => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    return controller;
  };

  const finishRequest = (controller: AbortController): void => {
    if (request.current === controller) {
      request.current = null;
      setLoading(false);
    }
  };

  const showRequestError = (error: unknown, fallback: string): void => {
    if (!isCanceled(error)) setErrorMessage(extractApiErrorMessage(error, fallback));
  };

  const acceptBuiltTree = (response: TreeBuildResult): void => {
    setTreeView({ tree: response.tree, traversals: response.traversals, isBst: true });
    setReconstructed(null);
    setWalk(null);
    setWalkIndex(0);
    setErrorMessage(null);
  };

  const addValue = async () => {
    const value = Number(valueInput);
    if (!/^-?\d+$/.test(valueInput.trim()) || !Number.isSafeInteger(value)) {
      setErrorMessage('Ingresa un número entero válido.');
      return;
    }
    if (values.includes(value)) {
      setErrorMessage(`El valor ${value} ya está en el árbol; no se permiten duplicados.`);
      return;
    }
    if (values.length >= MAX_NODES) {
      setErrorMessage(`El límite práctico es ${MAX_NODES} nodos.`);
      return;
    }
    const nextValues = [...values, value];
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.buildTree(
        { mode: 'values', values: nextValues },
        controller.signal
      );
      setValues(nextValues);
      setValueInput('');
      acceptBuiltTree(response);
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo insertar el valor.');
    } finally {
      finishRequest(controller);
    }
  };

  const resetValues = (): void => {
    request.current?.abort();
    setValues([]);
    setTreeView(null);
    setReconstructed(null);
    setWalk(null);
    setErrorMessage(null);
  };

  const generateRandom = async () => {
    const count = Number(countInput);
    if (!Number.isInteger(count) || count < 1 || count > MAX_NODES) {
      setErrorMessage(`Indica una cantidad entera entre 1 y ${MAX_NODES}.`);
      return;
    }
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.buildTree(
        { mode: 'random', count },
        controller.signal
      );
      setValues(response.traversals.preorder);
      acceptBuiltTree(response);
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo generar el árbol aleatorio.');
    } finally {
      finishRequest(controller);
    }
  };

  const useEditorGraph = async () => {
    const converted = treeFromGraph(nodes, edges);
    if (!converted.ok) {
      setErrorMessage(converted.reason);
      return;
    }
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const [preorder, inorder, postorder] = await Promise.all(
        ORDERS.map(({ id }) => GraphServiceAPI.traverseTree(converted.tree, id, controller.signal))
      );
      const traversals = {
        preorder: preorder.values,
        inorder: inorder.values,
        postorder: postorder.values,
      };
      setTreeView({ tree: converted.tree, traversals, isBst: traversals.inorder.every((value, index, all) => index === 0 || all[index - 1] < value) });
      setReconstructed(null);
      setWalk(null);
      setValues(traversals.preorder);
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo cargar el árbol del editor.');
    } finally {
      finishRequest(controller);
    }
  };

  const runTraversal = async () => {
    if (!activeTree) return;
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.traverseTree(activeTree.tree, order, controller.signal);
      setWalk(response);
      setWalkIndex(0);
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo recorrer el árbol.');
    } finally {
      finishRequest(controller);
    }
  };

  const reconstruct = async () => {
    const inorder = parseTraversalInput(inorderText);
    if (!inorder.ok) {
      setReconstructionError(inorder.message);
      setReconstructed(null);
      return;
    }
    const other = parseTraversalInput(otherText);
    if (!other.ok) {
      setReconstructionError(other.message);
      setReconstructed(null);
      return;
    }
    const controller = beginRequest();
    setReconstructionError(null);
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.reconstructTree({
        inorder: inorder.values,
        other: other.values,
        other_order: otherOrder,
      }, controller.signal);
      setReconstructed({
        tree: response.tree,
        traversals: response.traversals,
        isBst: response.is_bst,
      });
      setWalk(null);
      setWalkIndex(0);
    } catch (error: unknown) {
      const message = extractApiErrorMessage(error, 'No se pudieron reconstruir los recorridos.');
      if (!isCanceled(error)) setReconstructionError(message);
      setReconstructed(null);
    } finally {
      finishRequest(controller);
    }
  };

  const loadExample = (): void => {
    setInorderText('4, 2, 5, 1, 6, 3, 7');
    setOtherText('1, 2, 4, 5, 3, 6, 7');
    setOtherOrder('preorder');
    setReconstructionError(null);
    setReconstructed(null);
  };

  const fillFromCurrent = (): void => {
    if (!activeTree) {
      setReconstructionError('Primero construye o carga un árbol.');
      return;
    }
    setInorderText(activeTree.traversals.inorder.join(', '));
    setOtherText(activeTree.traversals[otherOrder].join(', '));
    setReconstructionError(null);
    setReconstructed(null);
  };

  const saveToEditor = (): void => {
    if (!activeTree || !layout) return;

    // Con una constelación abierta esto reescribiría su forma. El store
    // lo rechaza igual, pero el motivo se explica acá y el boton viene
    // deshabilitado en el panel.
    if (structureLocked) {
      setErrorMessage(
        'La constelación abierta está protegida: su forma es fija, así que el árbol no puede reemplazarla.'
      );
      return;
    }

    if (nodes.length > 0 && !window.confirm('El grafo actual tiene contenido. ¿Reemplazarlo por este árbol?')) return;
    const projectId = returnTo.match(/^\/galaxy\/([^/]+)/)?.[1];
    if (projectId && !saveProjectGraph(decodeURIComponent(projectId), layout.nodes, layout.edges)) {
      setErrorMessage('No se encontró el proyecto de destino; el árbol no se guardó.');
      return;
    }
    replaceGraph(layout.nodes, layout.edges);
    setErrorMessage(null);
  };

  const setReconstructionField = (field: 'inorder' | 'other', value: string): void => {
    if (field === 'inorder') setInorderText(value);
    else setOtherText(value);
    setReconstructed(null);
    setWalk(null);
    setReconstructionError(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden text-ink">
      <main className="min-w-0 flex-1 overflow-auto p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <BackButton to={returnTo} />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">Estructuras · árboles</span>
        </div>
        <header className="glass-panel rounded-2xl p-5">
          <p className="eyebrow">Árbol binario de búsqueda</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold">Construir, recorrer y fusionar</h1>
          <p className="mt-2 text-sm text-ink-muted">Al insertar, los menores van a la izquierda y los mayores a la derecha. Máximo práctico: {MAX_NODES} nodos.</p>
        </header>

        <section className="glass-panel mt-4 rounded-2xl p-5">
          <h2 className="font-bold">1 · Construir</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setMode('values'); setErrorMessage(null); }} className={`rounded-lg px-3 py-2 text-sm ${mode === 'values' ? 'bg-brand text-white' : 'bg-white/5 text-ink-muted'}`}>Valores individuales</button>
            <button type="button" onClick={() => { setMode('random'); setErrorMessage(null); }} className={`rounded-lg px-3 py-2 text-sm ${mode === 'random' ? 'bg-brand text-white' : 'bg-white/5 text-ink-muted'}`}>Aleatorio</button>
          </div>
          {mode === 'values' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <input aria-label="Valor entero" type="number" value={valueInput} onChange={(event) => setValueInput(event.target.value)} className="rounded-lg bg-[#0b1328] p-2 text-sm" placeholder="Valor entero" />
              <button type="button" onClick={addValue} disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Agregar</button>
              <button type="button" onClick={resetValues} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Reiniciar</button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="text-sm">Cantidad de números
                <input aria-label="Cantidad aleatoria" type="number" min="1" max={MAX_NODES} value={countInput} onChange={(event) => setCountInput(event.target.value)} className="ml-2 rounded-lg bg-[#0b1328] p-2" />
              </label>
              <button type="button" onClick={generateRandom} disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Generar árbol</button>
            </div>
          )}
          {values.length > 0 && <p className="mt-3 text-sm text-ink-muted">Insertados: {values.join(', ')}</p>}
          <button
            type="button"
            onClick={useEditorGraph}
            disabled={loading}
            title="Solo lee el lienzo: no modifica la constelación. Si el grafo actual no es un árbol válido, se explica el motivo."
            className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Usar el grafo del editor
          </button>
          <button
            type="button"
            onClick={saveToEditor}
            disabled={!activeTree || structureLocked}
            title={structureLocked ? 'La constelación abierta tiene la forma fija: no se le puede reemplazar el grafo.' : undefined}
            className="ml-2 mt-3 rounded-lg border border-brand/40 px-4 py-2 text-sm text-brand disabled:opacity-40"
          >
            Enviar al editor / guardar en el grafo actual
          </button>
          {structureLocked && (
            <p className="mt-2 max-w-xl text-xs text-ink-muted">
              Hay una <strong className="text-ink">constelación protegida</strong> en el editor:
              su forma es fija, así que «Enviar al editor» está deshabilitado.
              «Usar el grafo del editor» sigue funcionando si el lienzo actual es un árbol
              válido.
            </p>
          )}
        </section>

        <section className="glass-panel mt-4 rounded-2xl p-5">
          <h2 className="font-bold">2 · Recorridos</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">Orden
              <select aria-label="Orden del recorrido" value={order} onChange={(event) => { setOrder(event.target.value as TreeOrder); setWalk(null); }} className="ml-2 rounded-lg bg-[#0b1328] p-2">
                {ORDERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" disabled={!activeTree || loading} onClick={runTraversal} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Recorrer</button>
          </div>
          {activeTree ? (
            <>
              {!activeTree.isBst && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-200">Este árbol reconstruido no cumple necesariamente la propiedad de búsqueda (ABB); se conserva como árbol binario general.</p>}
              <p className="mt-3 text-sm text-ink-muted">Pre-order: {activeTree.traversals.preorder.join(' → ')}</p>
              <p className="mt-1 text-sm text-ink-muted">In-order: {activeTree.traversals.inorder.join(' → ')}</p>
              <p className="mt-1 text-sm text-ink-muted">Post-order: {activeTree.traversals.postorder.join(' → ')}</p>
              {walk && <div className="mt-3 rounded-lg bg-white/[0.04] p-3">
                <p className="text-sm font-semibold">{ORDERS.find((item) => item.id === order)?.label}: {walk.values.join(' → ')}</p>
                {walk.visits.length > 0 && <div className="mt-2 flex items-center gap-3">
                  <button type="button" aria-label="Visita anterior" disabled={walkIndex === 0} onClick={() => setWalkIndex((value) => value - 1)} className="rounded border border-white/15 px-3 py-1 disabled:opacity-40">Anterior</button>
                  <input aria-label="Visita actual" type="range" min="0" max={walk.visits.length - 1} value={walkIndex} onChange={(event) => setWalkIndex(Number(event.target.value))} className="flex-1 accent-brand" />
                  <button type="button" aria-label="Visita siguiente" disabled={walkIndex >= walk.visits.length - 1} onClick={() => setWalkIndex((value) => value + 1)} className="rounded border border-white/15 px-3 py-1 disabled:opacity-40">Siguiente</button>
                  <span className="text-xs text-ink-muted">{walkIndex + 1}/{walk.visits.length}</span>
                </div>}
              </div>}
              {layout && <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-[#0b1328] p-2">
                <svg role="img" aria-label="Dibujo del árbol binario" width={layout.width} height={layout.height} className="mx-auto">
                  {layout.edges.map((edge) => {
                    const from = nodePositions.get(edge.source);
                    const to = nodePositions.get(edge.target);
                    if (!from || !to) return null;
                    return <line key={edge.id} x1={from.x} y1={from.y + 22} x2={to.x} y2={to.y - 22} stroke="#7692c8" strokeWidth="2" markerEnd="url(#tree-arrow)" />;
                  })}
                  <defs><marker id="tree-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L0,8 L9,4 z" fill="#7692c8" /></marker></defs>
                  {layout.nodes.map((node) => {
                    const active = currentVisit?.id === node.id;
                    return <g key={node.id} transform={`translate(${node.position.x},${node.position.y})`}>
                      <circle r="22" fill={active ? '#f4c66a' : '#16264b'} stroke={active ? '#fff0bf' : '#7d91ba'} strokeWidth="2" />
                      <text textAnchor="middle" dominantBaseline="central" fill={active ? '#101b37' : '#f4f6ff'} fontSize="13" fontWeight="700">{node.data.label}</text>
                    </g>;
                  })}
                </svg>
              </div>}
            </>
          ) : <p className="mt-3 text-sm text-ink-muted">Construye un árbol o carga uno desde el editor para ver sus recorridos.</p>}
        </section>

        <section className="glass-panel mt-4 rounded-2xl p-5">
          <h2 className="font-bold">3 · Fusionar recorridos</h2>
          <p className="mt-2 text-xs text-ink-muted">Reconstruye un árbol con in-order + pre-order o in-order + post-order. Pre-order + post-order no determina un árbol único y no se admite.</p>
          <label className="mt-3 block text-sm">In-order
            <textarea aria-label="Cadena in-order" value={inorderText} onChange={(event) => setReconstructionField('inorder', event.target.value)} className="mt-1 min-h-16 w-full rounded-lg bg-[#0b1328] p-2 font-mono" placeholder="4, 2, 5, 1, 6, 3, 7" />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm">Otro recorrido
              <select aria-label="Tipo del otro recorrido" value={otherOrder} onChange={(event) => { setOtherOrder(event.target.value as 'preorder' | 'postorder'); setReconstructed(null); setReconstructionError(null); }} className="ml-2 rounded-lg bg-[#0b1328] p-2">
                <option value="preorder">Pre-order</option><option value="postorder">Post-order</option>
              </select>
            </label>
            <button type="button" onClick={loadExample} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Cargar ejemplo</button>
            <button type="button" onClick={fillFromCurrent} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Usar recorridos del árbol actual</button>
          </div>
          <label className="mt-3 block text-sm">{otherOrder === 'preorder' ? 'Pre-order' : 'Post-order'}
            <textarea aria-label="Otra cadena" value={otherText} onChange={(event) => setReconstructionField('other', event.target.value)} className="mt-1 min-h-16 w-full rounded-lg bg-[#0b1328] p-2 font-mono" />
          </label>
          {reconstructionError && <p role="alert" className="mt-3 rounded-lg border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">{reconstructionError}</p>}
          <button type="button" onClick={reconstruct} disabled={loading} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Construir árbol</button>
        </section>

        {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">{errorMessage}</p>}
        {loading && <p role="status" className="mt-3 text-sm text-ink-muted">Procesando árbol…</p>}
      </main>
      <Sidebar />
    </div>
  );
};

export default TreesPage;
