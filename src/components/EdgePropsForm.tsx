import React, { useEffect, useState } from 'react';
import { Save, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button, SectionHeader, TextField } from '../ui';
import type { AppNode, AppEdge } from '../types/graph';
import { useEdgeDirectionLogic } from '../hooks/useEdgeDirectionLogic';

const EdgeIcon: React.FC = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.8} d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

interface EdgePropsFormProps {
  edge: AppEdge;
  nodes: AppNode[];
  edges: AppEdge[];
  onSave: (weight: number, isDirected: boolean) => void;
  onDelete: () => void;
  onReverse: () => void;
  disabled?: boolean;
}

export const EdgePropsForm: React.FC<EdgePropsFormProps> = ({
  edge,
  nodes,
  edges,
  onSave,
  onDelete,
  onReverse,
  disabled = false,
}) => {
  const {
    existingDirectedEdge,
    sourceLabel,
    targetLabel,
    nextSourceLabel,
    nextTargetLabel,
  } = useEdgeDirectionLogic(edge, nodes, edges);

  const [edgeWeight, setEdgeWeight] = useState(String(edge.data?.weight ?? 1));
  const [edgeDirected, setEdgeDirected] = useState(edge.data?.is_directed ?? false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEdgeWeight(String(edge.data?.weight ?? 1));
    setEdgeDirected(edge.data?.is_directed ?? false);
  }, [edge]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedWeight = Number(edgeWeight);
    if (!Number.isFinite(parsedWeight)) return;
    onSave(parsedWeight, edgeDirected);
  };

  return (
    <section className="animate-in fade-in slide-in-from-right-2 duration-200">
      <SectionHeader icon={<EdgeIcon />} label="Arista" title="Editar conexión" />

      <div className="mb-5 rounded-xl border border-brand/20 bg-brand-muted px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Dirección actual</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{sourceLabel}</span>
          <svg className="h-4 w-4 shrink-0 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5l5 5-5 5" />
          </svg>
          <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-ink">{targetLabel}</span>
        </div>
      </div>

      {!edgeDirected && existingDirectedEdge && (
        <div className="mb-5 rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
          <p className="text-xs font-bold text-warning">Ya existe una arista dirigida entre estos nodos.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-warning">
            Al volver a activar la dirección, esta arista tomará el sentido contrario para conservar la conexión bidireccional.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-warning">
            <span>{nextSourceLabel}</span>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5l5 5-5 5" />
            </svg>
            <span>{nextTargetLabel}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          name="edge-weight"
          type="number"
          step="any"
          label="Peso / Costo"
          placeholder="Ej. 10.5"
          value={edgeWeight}
          onChange={(e) => setEdgeWeight(e.target.value)}
          disabled={disabled}
        />

        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-3">
            <div className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', edgeDirected ? 'bg-brand-muted text-brand' : 'bg-border text-slate-400'].join(' ')}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={1.8} d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">Arista dirigida</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Puedes activar o quitar la dirección en cualquier momento.
              </p>
            </div>
            <input
              type="checkbox"
              checked={edgeDirected}
              onChange={(e) => setEdgeDirected(e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-border accent-brand"
              disabled={disabled}
            />
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <span className="text-xs font-semibold text-slate-500">
              {edgeDirected ? 'Con dirección' : 'Sin dirección'}
            </span>
          </div>
        </div>

        {edgeDirected && existingDirectedEdge && (
          <div className="rounded-xl border border-brand/20 bg-brand-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Dirección que se guardará</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="min-w-0 truncate text-sm font-bold text-ink">{nextSourceLabel}</span>
              <svg className="h-4 w-4 shrink-0 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5l5 5-5 5" />
              </svg>
              <span className="min-w-0 truncate text-sm font-bold text-ink">{nextTargetLabel}</span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          leftIcon={<Save className="h-4 w-4" />}
          disabled={disabled || edgeWeight.trim() === '' || !Number.isFinite(Number(edgeWeight))}
        >
          Guardar cambios
        </Button>

        <div className="border-t border-border pt-5" />

        <Button
          type="button"
          onClick={onReverse}
          variant="secondary"
          leftIcon={<ArrowRightLeft className="h-4 w-4" />}
          disabled={disabled || !edgeDirected}
        >
          Invertir dirección
        </Button>

        <div className="border-t border-border pt-5" />

        <Button type="button" onClick={onDelete} variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} disabled={disabled}>
          Eliminar arista
        </Button>
      </form>
    </section>
  );
};