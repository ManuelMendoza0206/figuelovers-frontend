import React from 'react';
import type { GraphTool } from '../types/graph';

interface GraphToolbarProps {
  activeTool: GraphTool;
  onToolChange: (tool: GraphTool) => void;
}

interface ToolButtonProps {
  active: boolean;
  label: string;
  title: string;
  /** Tecla que activa la herramienta; se muestra y se agrega al title. */
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  active,
  label,
  title,
  shortcut,
  onClick,
  children,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${title} (${shortcut})` : title}
      aria-label={shortcut ? `${title} (${shortcut})` : title}
      aria-pressed={active}
      className={[
        'group flex h-10 items-center gap-2 rounded-lg px-3',
        'text-xs font-bold transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand/30',
        active
          ? 'bg-brand text-[#07101f] shadow-sm'
          : 'bg-white/[0.04] text-ink hover:bg-brand/10 hover:text-brand',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition',
          active
            ? 'bg-[#07101f]/15 text-[#07101f]'
            : 'bg-brand-muted text-brand group-hover:bg-brand/15',
        ].join(' ')}
      >
        {children}
      </span>

      <span>{label}</span>

      {shortcut && (
        <kbd
          aria-hidden="true"
          className={[
            'rounded border px-1.5 py-0.5 font-mono text-[9px] font-medium leading-none transition',
            active
              ? 'border-[#07101f]/25 bg-[#07101f]/10 text-[#07101f]'
              : 'border-white/15 bg-white/[0.06] text-ink-subtle group-hover:text-brand',
          ].join(' ')}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  );
};

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  activeTool,
  onToolChange,
}) => {
  return (
    <div
      className="pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#070d1d]/80 p-1.5 shadow-2xl backdrop-blur-md"
      role="toolbar"
      aria-label="Herramientas del grafo"
    >
      <ToolButton
        active={activeTool === 'interact'}
        label="Interactuar"
        title="Modo interactuar: mueve nodos, selecciona y edita elementos"
        shortcut="Q"
        onClick={() => onToolChange('interact')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 3l4 15 2.5-5L17 10 5 3z"
          />
          <path
            strokeLinecap="round"
            strokeWidth={1.8}
            d="M12 13l4 7"
          />
        </svg>
      </ToolButton>

      <ToolButton
        active={activeTool === 'connect'}
        label="Conectar"
        title="Modo conectar: arrastra de un nodo a otro para crear una arista"
        shortcut="W"
        onClick={() => onToolChange('connect')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle
            cx="7"
            cy="12"
            r="2.5"
            strokeWidth={1.8}
          />
          <circle
            cx="17"
            cy="12"
            r="2.5"
            strokeWidth={1.8}
          />
          <path
            strokeLinecap="round"
            strokeWidth={1.8}
            d="M9.5 12h5m-2-2l2 2-2 2"
          />
        </svg>
      </ToolButton>

      <span
        className="mx-1 h-6 w-px bg-white/10"
        aria-hidden="true"
      />

      <ToolButton
        active={activeTool === 'add'}
        label="Añadir nodo"
        title="Modo añadir: haz clic en una zona vacía del lienzo para crear una estrella"
        shortcut="E"
        onClick={() => onToolChange('add')}
      >
        <span className="text-lg font-medium leading-none">+</span>
      </ToolButton>

      <ToolButton
        active={activeTool === 'delete'}
        label="Eliminar"
        title="Modo eliminar: haz clic en una estrella o una conexión para confirmar su borrado"
        shortcut="P"
        onClick={() => onToolChange('delete')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeWidth={1.8}
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </ToolButton>
    </div>
  );
};

export default GraphToolbar;
