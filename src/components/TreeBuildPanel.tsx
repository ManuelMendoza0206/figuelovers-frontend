import { Dices, Plus, RotateCcw, SendHorizontal, Workflow } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { GraphServiceAPI, isCanceled } from '../services/api';
import { useGraphStore } from '../store/useGraphStore';
import { TREE_ORDERS, useTreeResult } from '../store/useTreeResult';
import { Button } from '../ui';
import { extractApiErrorMessage } from '../utils/apiError';
import { saveProjectGraph } from '../utils/projectStorage';
import { layoutTree } from '../utils/treeLayout';
import { treeFromGraph } from '../utils/treeFromGraph';

const MAX_NODES = 31;

/**
 * Panel de construcción del sidebar en /trees (sección "Construir" de
 * la página, mudada acá). No guarda estado local del árbol: todo vive
 * en `useTreeResult` para sobrevivir a la navegación.
 */

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20';

type ValuesParseResult = { ok: true; values: number[] } | { ok: false; reason: string };

/**
 * "4, 2, 5" → [4, 2, 5]. Tolera espacios y comas de más, pero el lote
 * se acepta o se rechaza entero: si un token no es entero o repite un
 * valor (dentro del lote o ya insertado), no se inserta nada y se
 * explica por qué.
 */
const parseValuesInput = (input: string, existing: number[]): ValuesParseResult => {
  const tokens = input
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { ok: false, reason: 'Ingresa al menos un número entero.' };
  }

  const values: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!/^-?\d+$/.test(token) || !Number.isSafeInteger(value)) {
      return { ok: false, reason: `“${token}” no es un número entero válido.` };
    }
    if (values.includes(value)) {
      return { ok: false, reason: `El valor ${value} está repetido en la lista.` };
    }
    if (existing.includes(value)) {
      return { ok: false, reason: `El valor ${value} ya está en el árbol; no se permiten duplicados.` };
    }
    values.push(value);
  }

  return { ok: true, values };
};

export const TreeBuildPanel: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';
  const { nodes, edges, loadGraph } = useGraphStore();
  const {
    mode,
    values,
    treeView,
    loading,
    setMode,
    setValues,
    acceptBuiltTree,
    resetTree,
    beginRequest,
    finishRequest,
  } = useTreeResult();
  const [valuesInput, setValuesInput] = useState('');
  const [countInput, setCountInput] = useState('7');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const layout = useMemo(
    () => (treeView ? layoutTree(treeView.tree) : null),
    [treeView]
  );

  const showRequestError = (error: unknown, fallback: string): void => {
    if (!isCanceled(error)) setErrorMessage(extractApiErrorMessage(error, fallback));
  };

  const addValues = async (): Promise<void> => {
    const parsed = parseValuesInput(valuesInput, values);
    if (!parsed.ok) {
      setErrorMessage(parsed.reason);
      return;
    }
    if (values.length + parsed.values.length > MAX_NODES) {
      setErrorMessage(`El límite práctico es ${MAX_NODES} nodos.`);
      return;
    }
    const nextValues = [...values, ...parsed.values];
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.buildTree(
        { mode: 'values', values: nextValues },
        controller.signal
      );
      setValues(nextValues);
      setValuesInput('');
      acceptBuiltTree({ tree: response.tree, traversals: response.traversals, isBst: true });
    } catch (error: unknown) {
      showRequestError(error, 'No se pudieron insertar los valores.');
    } finally {
      finishRequest(controller);
    }
  };

  const generateRandom = async (): Promise<void> => {
    const count = Number(countInput);
    if (!Number.isInteger(count) || count < 1 || count > MAX_NODES) {
      setErrorMessage(`Indica una cantidad entera entre 1 y ${MAX_NODES}.`);
      return;
    }
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const response = await GraphServiceAPI.buildTree({ mode: 'random', count }, controller.signal);
      setValues(response.traversals.preorder);
      acceptBuiltTree({ tree: response.tree, traversals: response.traversals, isBst: true });
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo generar el árbol aleatorio.');
    } finally {
      finishRequest(controller);
    }
  };

  const useEditorGraph = async (): Promise<void> => {
    const converted = treeFromGraph(nodes, edges);
    if (!converted.ok) {
      setErrorMessage(converted.reason);
      return;
    }
    const controller = beginRequest();
    setErrorMessage(null);
    try {
      const [preorder, inorder, postorder] = await Promise.all(
        TREE_ORDERS.map(({ id }) => GraphServiceAPI.traverseTree(converted.tree, id, controller.signal))
      );
      const traversals = {
        preorder: preorder.values,
        inorder: inorder.values,
        postorder: postorder.values,
      };
      acceptBuiltTree({
        tree: converted.tree,
        traversals,
        isBst: traversals.inorder.every((value, index, all) => index === 0 || all[index - 1] < value),
      });
      setValues(traversals.preorder);
    } catch (error: unknown) {
      showRequestError(error, 'No se pudo cargar el árbol del editor.');
    } finally {
      finishRequest(controller);
    }
  };

  const saveToEditor = (): void => {
    if (!treeView || !layout) return;
    if (nodes.length > 0 && !window.confirm('El grafo actual tiene contenido. ¿Reemplazarlo por este árbol?')) return;
    const projectId = returnTo.match(/^\/galaxy\/([^/]+)/)?.[1];
    if (projectId && !saveProjectGraph(decodeURIComponent(projectId), layout.nodes, layout.edges)) {
      setErrorMessage('No se encontró el proyecto de destino; el árbol no se guardó.');
      return;
    }
    loadGraph(layout.nodes, layout.edges);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-muted p-1">
          <button
            type="button"
            aria-pressed={mode === 'values'}
            onClick={() => { setMode('values'); setErrorMessage(null); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === 'values' ? 'bg-brand text-[#07101f]' : 'text-ink-muted hover:text-ink'}`}
          >
            Valores individuales
          </button>
          <button
            type="button"
            aria-pressed={mode === 'random'}
            onClick={() => { setMode('random'); setErrorMessage(null); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === 'random' ? 'bg-brand text-[#07101f]' : 'text-ink-muted hover:text-ink'}`}
          >
            Aleatorio
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-4 text-ink-muted">Máximo práctico: {MAX_NODES} nodos.</p>

        {mode === 'values' ? (
          <div className="mt-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-ink-muted">Valores</span>
              <input
                type="text"
                value={valuesInput}
                onChange={(event) => setValuesInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void addValues();
                  }
                }}
                placeholder="Ej. 42, 7, 15"
                autoComplete="off"
                className={FIELD_CLASS}
              />
            </label>
            <p className="text-[11px] leading-4 text-ink-muted">
              Separados por coma; se insertan en ese orden.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addValues}
                disabled={loading}
                className="flex-1"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Agregar
              </Button>
              <Button
                type="button"
                onClick={resetTree}
                variant="secondary"
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reiniciar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-ink-muted">Cantidad de números</span>
              <input
                type="number"
                min="1"
                max={MAX_NODES}
                value={countInput}
                onChange={(event) => setCountInput(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <Button
              type="button"
              onClick={generateRandom}
              disabled={loading}
              fullWidth
              leftIcon={<Dices className="h-4 w-4" />}
            >
              Generar árbol
            </Button>
          </div>
        )}

        {values.length > 0 && (
          <p className="mt-3 rounded-xl border border-border/60 bg-surface-muted px-3 py-2 text-xs leading-5 text-ink-muted">
            Insertados: <span className="font-mono text-ink">{values.join(', ')}</span>
          </p>
        )}
      </section>

      <div className="border-t border-border pt-5" />

      <section className="space-y-2">
        <Button
          type="button"
          onClick={useEditorGraph}
          disabled={loading}
          variant="secondary"
          fullWidth
          leftIcon={<Workflow className="h-4 w-4" />}
        >
          Usar el grafo del editor
        </Button>
        <Button
          type="button"
          onClick={saveToEditor}
          disabled={!treeView}
          fullWidth
          leftIcon={<SendHorizontal className="h-4 w-4" />}
        >
          Enviar al editor
        </Button>
        <p className="text-[11px] leading-4 text-ink-muted">Reemplaza el grafo actual con este árbol.</p>
      </section>

      {errorMessage && (
        <p role="alert" className="rounded-xl border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
