import { GitBranch, Pencil } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AlgorithmFileActions } from '../components/AlgorithmFileActions';
import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { TreeBuildPanel } from '../components/TreeBuildPanel';
import { GraphServiceAPI, isCanceled } from '../services/api';
import { TREE_ORDERS, useTreeResult } from '../store/useTreeResult';
import type { TreeOrder } from '../types/graph';
import { Button } from '../ui';
import { readTreeFileData } from '../utils/algorithmFiles';
import { extractApiErrorMessage } from '../utils/apiError';
import { layoutTree } from '../utils/treeLayout';
import {
  balancedPreorder,
  inorderFromPrePost,
  parseTraversalInput,
  sameSequence,
} from '../utils/treeTraversal';

/**
 * Página de árboles.
 *
 * El panel lateral (constructor) y esta área comparten `useTreeResult`:
 * construir un árbol, recorrerlo y salir de la página no borra nada.
 * Acá quedan los recorridos —controles arriba, dibujo debajo— y el
 * dibujo se queda con todo el espacio disponible; si el árbol es más
 * grande, se navega con scroll.
 */

const TreesPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const {
    values,
    treeView,
    order,
    walk,
    walkIndex,
    loading,
    setOrder,
    setWalk,
    setWalkIndex,
    acceptBuiltTree,
    setValues,
    resetTree,
    beginRequest,
    finishRequest,
  } = useTreeResult();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<TreeOrder | null>(null);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [firstTraversalOrder, setFirstTraversalOrder] = useState<TreeOrder>('inorder');
  const [secondTraversalOrder, setSecondTraversalOrder] = useState<TreeOrder>('postorder');
  const [firstTraversalDraft, setFirstTraversalDraft] = useState(
    () => treeView?.traversals.inorder.join(', ') ?? ''
  );
  const [secondTraversalDraft, setSecondTraversalDraft] = useState(
    () => treeView?.traversals.postorder.join(', ') ?? ''
  );
  const [reconstructError, setReconstructError] = useState<string | null>(null);
  const [reconstructNotice, setReconstructNotice] = useState<string | null>(null);

  const layout = useMemo(
    () => (treeView ? layoutTree(treeView.tree) : null),
    [treeView]
  );
  const currentVisit = walk?.visits[walkIndex] ?? null;
  const nodePositions = useMemo(
    () => new Map(layout?.nodes.map((node) => [node.id, node.position]) ?? []),
    [layout]
  );

  const runTraversal = async (): Promise<void> => {
    if (!treeView) return;
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.traverseTree(treeView.tree, order, controller.signal);
      setWalk(response);
    } catch (error: unknown) {
      if (!isCanceled(error)) setErrorMessage(extractApiErrorMessage(error, 'No se pudo recorrer el árbol.'));
    } finally {
      finishRequest(controller);
    }
  };

  const fillCurrentTraversals = (): void => {
    if (!treeView) return;
    setFirstTraversalOrder('inorder');
    setSecondTraversalOrder('postorder');
    setFirstTraversalDraft(treeView.traversals.inorder.join(', '));
    setSecondTraversalDraft(treeView.traversals.postorder.join(', '));
    setReconstructError(null);
    setReconstructNotice(null);
  };

  const runReconstruction = async (): Promise<void> => {
    setReconstructNotice(null);
    if (firstTraversalOrder === secondTraversalOrder) {
      setReconstructError('Elegí dos recorridos distintos.');
      return;
    }

    const first = parseTraversalInput(firstTraversalDraft);
    if (!first.ok) {
      setReconstructError(`Recorrido 1: ${first.reason}`);
      return;
    }
    const second = parseTraversalInput(secondTraversalDraft);
    if (!second.ok) {
      setReconstructError(`Recorrido 2: ${second.reason}`);
      return;
    }

    let inorderValues: number[];
    let otherValues: number[];
    let otherOrder: 'preorder' | 'postorder';
    let notice: string | null = null;

    if (firstTraversalOrder === 'inorder') {
      if (secondTraversalOrder === 'inorder') {
        setReconstructError('Elegí dos recorridos distintos.');
        return;
      }
      inorderValues = first.values;
      otherValues = second.values;
      otherOrder = secondTraversalOrder;
    } else if (secondTraversalOrder === 'inorder') {
      inorderValues = second.values;
      otherValues = first.values;
      otherOrder = firstTraversalOrder;
    } else {
      const preorderValues =
        firstTraversalOrder === 'preorder' ? first.values : second.values;
      const postorderValues =
        firstTraversalOrder === 'postorder' ? first.values : second.values;
      const derived = inorderFromPrePost(preorderValues, postorderValues);
      if (!derived.ok) {
        setReconstructError(derived.reason);
        return;
      }

      inorderValues = derived.inorder;
      otherValues = preorderValues;
      otherOrder = 'preorder';
      if (derived.preferredBst && derived.ambiguous) {
        notice =
          'Pre-order + Post-order no determinan un árbol único, pero son compatibles con un ABB. Se muestra esa interpretación y el In-order ordenado.';
      } else if (derived.ambiguous) {
        notice =
          'Pre-order + Post-order no determinan un árbol único cuando hay nodos con un solo hijo. Se muestra una reconstrucción posible usando el hijo izquierdo en esos casos.';
      } else {
        notice =
          'Pre-order + Post-order determinan este árbol completo. El In-order resultante se muestra abajo.';
      }
    }

    const controller = beginRequest();
    setReconstructError(null);
    setReconstructNotice(notice);
    try {
      const response = await GraphServiceAPI.reconstructTree(
        {
          inorder: inorderValues,
          other: otherValues,
          other_order: otherOrder,
        },
        controller.signal
      );
      setValues(response.traversals.preorder);
      acceptBuiltTree({
        tree: response.tree,
        traversals: response.traversals,
        isBst: response.is_bst,
      });
    } catch (error: unknown) {
      if (!isCanceled(error)) {
        setReconstructNotice(null);
        setReconstructError(
          extractApiErrorMessage(error, 'No se pudo reconstruir el árbol con esos recorridos.')
        );
      }
    } finally {
      finishRequest(controller);
    }
  };

  const loadTreeFile = (raw: unknown): string | null => {
    try {
      const data = readTreeFileData(raw);
      resetTree();
      setValues(data.values);
      setOrder(data.order);
      if (data.treeView) acceptBuiltTree(data.treeView);
      setFirstTraversalOrder('inorder');
      setSecondTraversalOrder('postorder');
      setFirstTraversalDraft(data.treeView?.traversals.inorder.join(', ') ?? '');
      setSecondTraversalDraft(data.treeView?.traversals.postorder.join(', ') ?? '');
      setEditingOrder(null);
      setDraft('');
      setEditError(null);
      setReconstructError(null);
      setReconstructNotice(null);
      setErrorMessage(null);
      return null;
    } catch (error: unknown) {
      return error instanceof Error ? error.message : 'No se pudo cargar el árbol.';
    }
  };

  const startEditing = (targetOrder: TreeOrder): void => {
    if (!treeView || loading) return;
    setEditingOrder(targetOrder);
    setDraft(treeView.traversals[targetOrder].join(', '));
    setEditError(null);
  };

  const cancelEditing = (): void => {
    if (loading) return;
    setEditingOrder(null);
    setDraft('');
    setEditError(null);
  };

  const updateTraversal = async (): Promise<void> => {
    if (!treeView || !editingOrder) return;

    const targetOrder = editingOrder;
    const parsed = parseTraversalInput(draft);
    if (!parsed.ok) {
      setEditError(parsed.reason);
      return;
    }

    if (sameSequence(parsed.values, treeView.traversals[targetOrder])) {
      setEditingOrder(null);
      setDraft('');
      setEditError(null);
      return;
    }

    // No se exige que la fila sea un recorrido válido: la entrada se toma
    // como nuevo conjunto/orden y el árbol se reorganiza desde cero.
    const insertionValues =
      targetOrder === 'preorder'
        ? parsed.values
        : targetOrder === 'postorder'
          ? [...parsed.values].reverse()
          : balancedPreorder([...parsed.values].sort((first, second) => first - second));

    const controller = beginRequest();
    setEditError(null);
    try {
      const response = await GraphServiceAPI.buildTree(
        { mode: 'values', values: insertionValues },
        controller.signal
      );
      setValues(insertionValues);
      acceptBuiltTree({ tree: response.tree, traversals: response.traversals, isBst: true });
      setEditingOrder(null);
      setDraft('');
    } catch (error: unknown) {
      if (!isCanceled(error)) {
        setEditError(
          extractApiErrorMessage(error, 'No se pudo reorganizar el árbol desde ese recorrido.')
        );
      }
    } finally {
      finishRequest(controller);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto text-ink md:flex-row md:overflow-hidden">
      <main className="flex w-full min-w-0 flex-col gap-4 p-5 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BackButton to={returnTo} />
          <div className="min-w-0">
            <p className="eyebrow text-[10px]">Árbol binario de búsqueda</p>
            <h1 className="mt-1 font-display text-xl font-extrabold leading-tight">Construir y recorrer</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="hidden font-mono text-xs uppercase tracking-widest text-ink-subtle sm:inline">
              Estructuras · árboles
            </span>
            <AlgorithmFileActions
              algorithm="trees"
              label="Árboles"
              data={{ values, order, treeView }}
              onLoad={loadTreeFile}
              canSave={values.length > 0 || treeView !== null}
              disabled={loading}
            />
          </div>
        </div>

        <section className="glass-panel shrink-0 rounded-2xl p-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <p className="text-sm font-bold text-ink">Recorridos</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">Orden</span>
                <select
                  aria-label="Orden del recorrido"
                  value={order}
                  onChange={(event) => setOrder(event.target.value as TreeOrder)}
                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {TREE_ORDERS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <Button type="button" disabled={!treeView || loading} onClick={runTraversal}>
                Recorrer
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">Reconstruir desde dos recorridos</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Elegí dos recorridos distintos. Con In-order se reconstruye directo; con
                  Pre-order + Post-order se muestra una reconstrucción posible.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fillCurrentTraversals}
                disabled={!treeView || loading}
              >
                Usar los actuales
              </Button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                    Recorrido 1
                  </span>
                  <select
                    aria-label="Tipo del recorrido 1"
                    value={firstTraversalOrder}
                    onChange={(event) => {
                      setFirstTraversalOrder(event.target.value as TreeOrder);
                      setReconstructError(null);
                      setReconstructNotice(null);
                    }}
                    disabled={loading}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {TREE_ORDERS.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <input
                  aria-label="Valores del recorrido 1"
                  type="text"
                  value={firstTraversalDraft}
                  onChange={(event) => {
                    setFirstTraversalDraft(event.target.value);
                    setReconstructError(null);
                    setReconstructNotice(null);
                  }}
                  placeholder="Ej. 4, 2, 5, 1, 6, 3"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                    Recorrido 2
                  </span>
                  <select
                    aria-label="Tipo del recorrido 2"
                    value={secondTraversalOrder}
                    onChange={(event) => {
                      setSecondTraversalOrder(event.target.value as TreeOrder);
                      setReconstructError(null);
                      setReconstructNotice(null);
                    }}
                    disabled={loading}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {TREE_ORDERS.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <input
                  aria-label="Valores del recorrido 2"
                  type="text"
                  value={secondTraversalDraft}
                  onChange={(event) => {
                    setSecondTraversalDraft(event.target.value);
                    setReconstructError(null);
                    setReconstructNotice(null);
                  }}
                  placeholder="Ej. 4, 5, 2, 6, 3, 1"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void runReconstruction()} disabled={loading}>
                Reconstruir árbol
              </Button>
              <span className="text-[11px] text-ink-muted">
                In-order + Pre-order, In-order + Post-order o Pre-order + Post-order.
              </span>
            </div>

            {reconstructError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200"
              >
                {reconstructError}
              </p>
            )}

            {reconstructNotice && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-5 text-amber-100"
              >
                {reconstructNotice}
              </p>
            )}
          </div>

          {treeView ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              {!treeView.isBst && (
                <p className="mb-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-200">
                  Este árbol no cumple la propiedad de búsqueda (ABB); se recorre igual como árbol binario general.
                </p>
              )}

              <div className="grid gap-2">
                {TREE_ORDERS.map(({ id, label }) => {
                  const isEditing = editingOrder === id;
                  const currentText = treeView.traversals[id].join(', ');

                  return (
                    <div
                      key={id}
                      className={
                        isEditing
                          ? 'rounded-xl border border-brand/30 bg-white/[0.04] p-2.5'
                          : 'flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03]'
                      }
                    >
                      {isEditing ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                              {label}
                            </span>
                            <input
                              aria-label={`Valores de ${label}`}
                              type="text"
                              value={draft}
                              autoFocus
                              autoComplete="off"
                              spellCheck={false}
                              disabled={loading}
                              onChange={(event) => {
                                setDraft(event.target.value);
                                setEditError(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void updateTraversal();
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelEditing();
                                }
                              }}
                              className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                            <Button
                              type="button"
                              size="sm"
                              aria-label={`Actualizar ${label}`}
                              disabled={loading || draft.trim() === currentText}
                              onClick={() => void updateTraversal()}
                            >
                              Actualizar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={loading}
                              onClick={cancelEditing}
                            >
                              Cancelar
                            </Button>
                          </div>
                          {editError && (
                            <p
                              role="alert"
                              className="mt-2 rounded-lg border border-red-300/30 bg-red-900/20 p-2.5 text-xs text-red-200"
                            >
                              {editError}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <span className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] ${id === order ? 'text-brand' : 'text-ink-subtle'}`}>
                            {label}
                          </span>
                          <p className={`min-w-0 flex-1 break-words font-mono text-xs leading-5 ${id === order ? 'text-ink' : 'text-ink-muted'}`}>
                            {treeView.traversals[id].join(' → ')}
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`Editar ${label}`}
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            disabled={loading}
                            onClick={() => startEditing(id)}
                          >
                            Editar
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-ink-muted">
                Editá una fila y presioná «Actualizar»: se reconstruye el árbol y se reorganizan las tres filas, aunque el orden no sea un recorrido válido.
              </p>

              {walk && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Visita anterior"
                    disabled={walkIndex === 0}
                    onClick={() => setWalkIndex(walkIndex - 1)}
                  >
                    Anterior
                  </Button>
                  <input
                    aria-label="Visita actual"
                    type="range"
                    min="0"
                    max={walk.visits.length - 1}
                    value={walkIndex}
                    onChange={(event) => setWalkIndex(Number(event.target.value))}
                    className="min-w-32 flex-1 accent-brand"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Visita siguiente"
                    disabled={walkIndex >= walk.visits.length - 1}
                    onClick={() => setWalkIndex(walkIndex + 1)}
                  >
                    Siguiente
                  </Button>
                  <span className="font-mono text-xs text-ink-muted">{walkIndex + 1}/{walk.visits.length}</span>
                  {currentVisit && (
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-[#f4c66a] px-2 py-0.5 font-mono text-xs font-bold text-[#101b37]">
                        {currentVisit.value}
                      </span>
                      <span className="sr-only">Visitando el valor {currentVisit.value}</span>
                    </span>
                  )}
                </div>
              )}

              {errorMessage && (
                <p role="alert" className="mt-3 rounded-lg border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">
                  {errorMessage}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 border-t border-white/10 pt-4 text-sm text-ink-muted">
              Los recorridos aparecerán cuando construyas o cargues un árbol.
            </p>
          )}
        </section>

        <section className="tree-stage glass-panel relative flex min-h-[30rem] flex-col overflow-hidden rounded-2xl md:min-h-[36rem] md:flex-1">
          <div className="field-stars pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

          {layout ? (
            <div className="relative min-h-0 flex-1 overflow-auto">
              <div className="flex min-h-full w-max min-w-full items-center justify-center p-6 md:p-10">
                <svg
                  role="img"
                  aria-label="Dibujo del árbol binario"
                  width={layout.width}
                  height={layout.height}
                >
                  <defs>
                    <marker id="tree-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0 L0,8 L9,4 z" fill="#7692c8" />
                    </marker>
                  </defs>
                  {layout.edges.map((edge) => {
                    const from = nodePositions.get(edge.source);
                    const to = nodePositions.get(edge.target);
                    if (!from || !to) return null;
                    return (
                      <line
                        key={edge.id}
                        x1={from.x}
                        y1={from.y + 22}
                        x2={to.x}
                        y2={to.y - 22}
                        stroke="#7692c8"
                        strokeWidth="2"
                        markerEnd="url(#tree-arrow)"
                      />
                    );
                  })}
                  {layout.nodes.map((node) => {
                    const active = currentVisit?.id === node.id;
                    return (
                      <g key={node.id} transform={`translate(${node.position.x},${node.position.y})`}>
                        {active && (
                          <circle className="tree-visit-ring" r="30" fill="none" stroke="#f4c66a" strokeWidth="1.5" />
                        )}
                        <circle
                          r="22"
                          fill={active ? '#f4c66a' : '#16264b'}
                          stroke={active ? '#fff0bf' : '#7d91ba'}
                          strokeWidth="2"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={active ? '#101b37' : '#f4f6ff'}
                          fontSize="13"
                          fontWeight="700"
                          className="font-mono"
                        >
                          {node.data.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
                <GitBranch className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-base font-bold text-ink">Todavía no hay árbol</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                  Agrega valores, genera uno al azar o carga el grafo del editor desde el panel Árbol binario.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div
              role="status"
              className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-[#0b1328]/90 px-3 py-1.5 text-xs text-ink-muted"
            >
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-brand" />
              Procesando árbol…
            </div>
          )}
        </section>
      </main>

      <Sidebar
        workbench={{
          icon: GitBranch,
          title: 'Árbol binario',
          subtitle: 'Menores a la izquierda, mayores a la derecha',
          iconClassName: 'bg-violet-300/10 text-violet-200',
        }}
      >
        <TreeBuildPanel />
      </Sidebar>
    </div>
  );
};

export default TreesPage;
