import { Lock, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { AppNode } from '../types/graph';
import { Button, SectionHeader, TextField } from '../ui';

const NodeIcon: React.FC = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
    <path strokeLinecap="round" strokeWidth={1.8} d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12m0-12.72l-2.12 2.12M7.76 15.24l-2.12 2.12" />
  </svg>
);

interface NodePropsFormProps {
  node: AppNode;
  onSave: (label: string) => void;
  disabled?: boolean;
}

export const NodePropsForm: React.FC<NodePropsFormProps> = ({
  node,
  onSave,
  disabled = false,
}) => {
  const [nodeLabel, setNodeLabel] = useState(node.data?.label ?? '');

  // Con la forma protegida el modo Eliminar no existe: el aviso tiene
  // que decir lo que SÍ se puede hacer (renombrar), no invitar a borrar.
  const structureLocked = useGraphStore((state) => state.structureLocked);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodeLabel(node.data?.label ?? '');
  }, [node]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedLabel = nodeLabel.trim();
    if (!trimmedLabel) return;
    onSave(trimmedLabel);
  };

  return (
    <section className="animate-in fade-in slide-in-from-right-2">
      <SectionHeader
        icon={<NodeIcon />}
        label="Nodo"
        title="Editar nombre"
        badge={
          typeof node.data?.folio === 'number' ? (
            <span className="ml-auto shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold tabular-nums text-ink/70" title="Folio del nodo">
              #{node.data.folio}
            </span>
          ) : undefined
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          name="node-label"
          label="Nombre del nodo"
          placeholder="Ej. Ciudad A"
          value={nodeLabel}
          onChange={(e) => setNodeLabel(e.target.value)}
          maxLength={50}
          autoComplete="off"
          disabled={disabled}
          helperText={`${nodeLabel.length}/50`}
        />

        <Button type="submit" leftIcon={<Save className="h-4 w-4" />} className="bg-brand text-[#07101f] hover:bg-brand-hover" disabled={disabled || !nodeLabel.trim()}>
          Guardar nombre
        </Button>

        <div className="border-t border-border pt-5" />

        {/* Antes aca vivia el boton "Eliminar nodo". Ahora hay UN solo
            botón de eliminar (el del lienzo) y el que dispara el borrado
            es el clic sobre el elemento, asi que esto solo orienta. */}
        {structureLocked ? (
          <p className="flex items-start gap-2 rounded-xl border border-mission/25 bg-mission/[0.07] px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
            <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mission" />
            <span>
              Estrella de una <strong className="font-bold text-ink">constelación protegida</strong>:
              su lugar en la figura es fijo y no se puede eliminar, pero el nombre sí cambia.
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
            <Trash2 aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ffb09a]" />
            <span>
              Para eliminar esta estrella: activa el modo{' '}
              <strong className="font-bold text-ink">Eliminar</strong> en la
              barra del lienzo y haz clic sobre ella. Atajo{' '}
              <kbd className="rounded border border-white/15 bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-ink">P</kbd>.
            </span>
          </p>
        )}
      </form>
    </section>
  );
};