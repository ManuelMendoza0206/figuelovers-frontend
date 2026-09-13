import React from 'react';
import type { GraphTool } from '../types/graph';

export type { GraphTool };

interface GraphToolbarProps {
  activeTool: GraphTool;
  onToolChange: (tool: GraphTool) => void;
  onAddNode: () => void;
}

interface ToolButtonProps {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  active,
  label,
  title,
  onClick,
  children,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={[
        'group flex h-10 items-center gap-2 rounded-lg px-3',
        'text-xs font-bold transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand/30',
        active
          ? 'bg-brand text-white shadow-sm'
          : 'bg-white text-ink hover:bg-brand-muted hover:text-brand',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition',
          active
            ? 'bg-white/15 text-white'
            : 'bg-brand-muted text-brand group-hover:bg-brand/15',
        ].join(' ')}
      >
        {children}
      </span>

      <span>{label}</span>
    </button>
  );
};

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  activeTool,
  onToolChange,
  onAddNode,
}) => {
  return (
    <div
      className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-white p-1.5 shadow-lg"
      role="toolbar"
      aria-label="Herramientas del grafo"
    >
      <ToolButton
        active={activeTool === 'interact'}
        label="Interactuar"
        title="Modo interactuar: mueve nodos, selecciona y edita elementos"
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
        className="mx-1 h-6 w-px bg-border"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onAddNode}
        title="Añadir un nuevo nodo"
        aria-label="Añadir un nuevo nodo"
        className="group flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-ink transition-all duration-150 hover:bg-brand-muted hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-muted text-lg font-medium leading-none text-brand transition group-hover:bg-brand/15">
          +
        </span>

        <span>Añadir nodo</span>
      </button>
    </div>
  );
};

export default GraphToolbar;