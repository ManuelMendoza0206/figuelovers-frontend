import React from 'react';

import type { JohnsonResultData } from '../types/graph';

interface JohnsonResultViewProps {
  result: JohnsonResultData;
  nodeIds: string[];
  source: string;
  target: string;
  getLabel: (nodeId: string) => string;
  selectedPath: string[];
}

/**
 * Contenido actual de Johnson: matriz de distancias y camino elegido.
 *
 * Vive aparte para no duplicarlo entre la pagina completa y el modo
 * pantalla completa del panel flotante. No decide nada: solo dibuja lo
 * que ya esta calculado.
 */
export const JohnsonResultView: React.FC<JohnsonResultViewProps> = ({
  result,
  nodeIds,
  source,
  target,
  getLabel,
  selectedPath,
}) => {
  if (result.has_negative_cycle) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        {result.message ?? 'El grafo contiene un ciclo de peso negativo.'}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand/10">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 font-semibold text-brand">Origen</th>
                {nodeIds.map((nodeId) => (
                  <th key={nodeId} className="border-b border-white/10 px-3 py-2 font-semibold text-brand">{getLabel(nodeId)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodeIds.map((sourceId) => (
                <tr key={sourceId}>
                  <td className="border-b border-white/10 px-3 py-2 font-semibold text-ink">{getLabel(sourceId)}</td>
                  {nodeIds.map((targetId) => {
                    const distance = result.distances[sourceId]?.[targetId];
                    return (
                      <td key={`${sourceId}-${targetId}`} className={`border-b border-white/10 px-3 py-2 font-mono ${sourceId === source && targetId === target ? 'bg-brand/15 font-bold text-brand' : 'text-ink-muted'}`}>
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

      <div className="glass-panel rounded-2xl border-brand/25 p-4">
        <h2 className="font-display text-base font-bold text-ink">Ruta seleccionada</h2>
        <p className="mt-2 text-sm text-ink-muted">{getLabel(source)} → {getLabel(target)}</p>
        <div className="mt-4 rounded-xl border border-brand/25 bg-brand/10 p-4 text-sm font-semibold text-brand shadow-[0_0_28px_rgba(114,230,224,0.1)]">
          {selectedPath.length > 0 ? selectedPath.map((nodeId) => getLabel(nodeId)).join(' → ') : 'No hay camino válido entre estos nodos.'}
        </div>
      </div>
    </div>
  );
};
