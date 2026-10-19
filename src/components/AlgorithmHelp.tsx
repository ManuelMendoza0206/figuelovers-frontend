import { ChevronDown, HelpCircle } from 'lucide-react';
import React, { useId, useState } from 'react';

interface AlgorithmHelpProps {
  /** Qué se explica; se muestra como subtítulo del botón. */
  title: string;
  /** Resumen de una línea, visible al abrir. */
  summary: string;
  /** Puntos de la explicación. Solo texto. */
  items: string[];
  className?: string;
}

/**
 * Ayuda de una sección: un bloque plegable de solo texto.
 *
 * Vive dentro de cada página de algoritmo para no obligar a abrir el
 * modal global. Arranca cerrado para no empujar la herramienta
 * principal fuera de la primera pantalla.
 */
export const AlgorithmHelp: React.FC<AlgorithmHelpProps> = ({
  title,
  summary,
  items,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className={`glass-panel shrink-0 overflow-hidden rounded-2xl ${className ?? ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">Ayuda</span>
          <span className="block text-xs text-ink-muted">{title}</span>
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-relaxed text-ink-muted"
        >
          <p className="text-ink">{summary}</p>
          {items.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
