import React, { useMemo } from 'react';

import { useGraphStore } from '../store/useGraphStore';
import {
  buildJohnsonGraphSignature,
  getJohnsonPath,
  useJohnsonResult,
} from '../store/useJohnsonResult';
import { JohnsonResultView } from './JohnsonResultView';

/**
 * Resultado de Johnson sin salir de la pizarra.
 *
 * Despues de calcular, la pagina de Johnson lleva al editor y este
 * panel queda flotando abajo: el camino se ve resaltado en el canvas y
 * aca sigue lo actual (origen, destino, distancia y ruta). No se cierra
 * solo ni se pierde al navegar: vive en el store y solo se oculta si el
 * grafo cambia y el resultado deja de ser valido.
 *
 * Si la matriz no entra, "Ver matriz" abre el mismo contenido en
 * pantalla completa dejando la pizarra atras.
 */
export const JohnsonFloatingPanel: React.FC = () => {
  const { nodes, edges } = useGraphStore();
  const { result, graphSignature, source, target, panel, setJohnsonPanel, clearJohnsonResult } =
    useJohnsonResult();

  const freshResult = useMemo(() => {
    if (!result || !graphSignature) return null;
    return graphSignature === buildJohnsonGraphSignature(nodes, edges)
      ? result
      : null;
  }, [result, graphSignature, nodes, edges]);

  const selectedPath = useMemo(
    () => getJohnsonPath(freshResult, source, target),
    [freshResult, source, target]
  );

  if (!freshResult) return null;

  const labelOf = (nodeId: string): string => {
    const node = nodes.find((current) => current.id === nodeId);
    return node?.data?.label?.trim() || nodeId;
  };

  const distance = freshResult.distances[source]?.[target];
  const nodeIds = nodes.map((node) => node.id);

  if (panel === 'full') {
    return (
      <div className="absolute inset-0 z-30 overflow-auto bg-[#03060f]/92 p-4 backdrop-blur-sm md:p-8" role="dialog" aria-label="Resultado completo de Johnson">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-[9px]">Johnson</p>
              <h2 className="font-display text-xl font-extrabold text-ink">
                {labelOf(source)} → {labelOf(target)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setJohnsonPanel('floating')}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
              >
                Volver a la pizarra
              </button>
              <button
                type="button"
                onClick={clearJohnsonResult}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
              >
                Cerrar
              </button>
            </div>
          </div>

          <JohnsonResultView
            result={freshResult}
            nodeIds={nodeIds}
            source={source}
            target={target}
            getLabel={labelOf}
            selectedPath={selectedPath}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-brand/25 bg-[#060c1c]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-[9px]">Johnson</p>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {labelOf(source)} → {labelOf(target)}
              <span className="ml-2 font-mono text-brand">
                {distance === null || distance === undefined ? '∞' : distance}
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-ink-muted">
              {selectedPath.length > 0
                ? selectedPath.map((nodeId) => labelOf(nodeId)).join(' → ')
                : 'No hay camino válido entre estos nodos.'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setJohnsonPanel('full')}
              className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-[#07101f] transition-colors hover:bg-brand-hover"
            >
              Ver matriz
            </button>
            <button
              type="button"
              onClick={clearJohnsonResult}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
