import React, { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button, SectionHeader, TextField } from '../ui';
import type { AppNode } from '../types/graph';

const NodeIcon: React.FC = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
    <path strokeLinecap="round" strokeWidth={1.8} d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12m0-12.72l-2.12 2.12M7.76 15.24l-2.12 2.12" />
  </svg>
);

interface NodePropsFormProps {
  node: AppNode;
  onSave: (label: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const NodePropsForm: React.FC<NodePropsFormProps> = ({
  node,
  onSave,
  onDelete,
  disabled = false,
}) => {
  const [nodeLabel, setNodeLabel] = useState(node.data?.label ?? '');

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
    <section className="animate-in fade-in slide-in-from-right-2 duration-200">
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

        <Button type="submit" leftIcon={<Save className="h-4 w-4" />} disabled={disabled || !nodeLabel.trim()}>
          Guardar nombre
        </Button>

        <div className="border-t border-border pt-5" />

        <Button
          type="button"
          onClick={onDelete}
          variant="danger"
          leftIcon={<Trash2 className="h-4 w-4" />}
          disabled={disabled}
        >
          Eliminar nodo
        </Button>
      </form>
    </section>
  );
};