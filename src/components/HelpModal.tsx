import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, Move, MousePointer, Plus, GitBranch, Trash2, ChevronDown } from 'lucide-react';
import { IconButton } from '../ui';

interface HelpItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: 'brand' | 'error';
}

const HELP_ITEMS: HelpItem[] = [
  {
    icon: <Move className="h-4 w-4" />,
    title: 'Mover',
    description: 'Desplaza los nodos por el lienzo y navega por el canvas.',
  },
  {
    icon: <MousePointer className="h-4 w-4" />,
    title: 'Seleccionar',
    description: 'Selecciona un nodo o una arista para editar sus propiedades en el panel lateral.',
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: 'Conectar',
    description: 'Activa Conectar y arrastra desde un nodo hasta otro. La dirección será automáticamente del origen al destino.',
  },
  {
    icon: <Plus className="h-4 w-4" />,
    title: 'Crear nodos',
    description: 'Usa "Añadir nodo" o haz doble clic sobre una zona vacía del lienzo.',
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: 'Editar aristas',
    description: 'Selecciona una arista para cambiar su peso, quitar su dirección o invertirla.',
  },
  {
    icon: <Trash2 className="h-4 w-4" />,
    title: 'Eliminar',
    description: 'Selecciona un elemento y utiliza el botón Eliminar del panel lateral.',
    accent: 'error',
  },
];

export const HelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <IconButton
        ref={buttonRef}
        onClick={() => setIsOpen((c) => !c)}
        aria-label="Ayuda"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Ayuda"
        variant="ghost"
        size="md"
        className={isOpen ? 'bg-brand-muted text-brand' : ''}
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Ayuda</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </IconButton>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Ayuda de Aristografos"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="border-b border-border bg-ink px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Cómo usar Aristografos</h2>
                <p className="mt-0.5 text-[11px] text-slate-300">Guía rápida del editor</p>
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-4">
            <div className="space-y-3">
              {HELP_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className={[
                    'flex gap-3 rounded-xl border p-3 transition',
                    item.accent === 'error'
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-border bg-surface-muted',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      item.accent === 'error'
                        ? 'bg-rose-50 text-rose-500'
                        : 'bg-brand-muted text-brand',
                    ].join(' ')}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border bg-surface-muted px-4 py-3">
            <p className="text-center text-[10px] font-medium text-slate-400">Aristografos · Editor de grafos</p>
          </div>
        </div>
      )}
    </div>
  );
};