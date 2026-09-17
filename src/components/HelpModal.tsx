import { ArrowRightLeft, ChevronDown, Crosshair, GitBranch, HelpCircle, MousePointerClick, Orbit, Plus, Route, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui';

interface HelpItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: 'brand' | 'error';
}

const HELP_ITEMS: HelpItem[] = [
  {
    icon: <MousePointerClick className="h-4 w-4" />,
    title: 'Interactuar',
    description: 'Selecciona nodos y aristas, arrástralos para moverlos y navega arrastrando el lienzo.',
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
    icon: <ArrowRightLeft className="h-4 w-4" />,
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

const ALGORITHM_ITEMS: HelpItem[] = [
  { icon: <Route className="h-4 w-4" />, title: 'Rutas interestelares (Johnson)', description: 'Calcula las distancias mínimas entre todos los pares de estrellas en un grafo dirigido, incluso con pesos negativos.' },
  { icon: <Crosshair className="h-4 w-4" />, title: 'Comando de misión (Húngaro)', description: 'Asigna exploradores a planetas buscando el menor costo o el mayor beneficio posible.' },
];

const UNIVERSE_ITEMS: HelpItem[] = [
  { icon: <Orbit className="h-4 w-4" />, title: 'Universo observable', description: 'La marca y el punto de entrada a toda la experiencia.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Red cósmica', description: 'El dashboard donde cada galaxia representa un proyecto guardado localmente.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Galaxia y constelación', description: 'Una galaxia es un proyecto; su constelación es el grafo formado por estrellas y líneas.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Rutas y misiones', description: 'Las conexiones representan viajes y la asignación representa recursos enviados a destinos planetarios.' },
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
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-brand/50 bg-brand/10 text-brand">
          <Orbit className="h-4 w-4" />
          <HelpCircle className="absolute h-2.5 w-2.5 fill-[#101b37]" />
        </span>
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
          <div className="border-b border-white/10 bg-[#0b1328] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-ink">Cómo usar Figuelovers</h2>
                <p className="mt-0.5 text-[11px] text-ink-muted">Guía rápida del observatorio</p>
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-4">
            <p className="eyebrow mb-3 text-[9px]">01 · funcionamiento básico</p>
            <div className="space-y-3">
              {HELP_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className={[
                    'flex gap-3 rounded-xl border p-3 transition',
                    item.accent === 'error'
                      ? 'border-[#ff9f80]/25 bg-[#ff9f80]/10'
                      : 'border-white/10 bg-white/[0.04]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      item.accent === 'error'
                        ? 'bg-[#ff9f80]/15 text-[#ffb09a]'
                        : 'bg-brand-muted text-brand',
                    ].join(' ')}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="eyebrow mb-3 mt-6 text-[9px]">02 · algoritmos</p>
            <div className="space-y-3">
              {ALGORITHM_ITEMS.map((item, index) => (
                <div key={`algorithm-${index}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">{item.icon}</span>
                  <div className="min-w-0"><p className="text-xs font-extrabold text-ink">{item.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{item.description}</p></div>
                </div>
              ))}
            </div>
            <p className="eyebrow mb-3 mt-6 text-[9px]">03 · conceptos del universo</p>
            <div className="space-y-3">
              {UNIVERSE_ITEMS.map((item, index) => (
                <div key={`universe-${index}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffd684]/10 text-[#ffd684]">{item.icon}</span>
                  <div className="min-w-0"><p className="text-xs font-extrabold text-ink">{item.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{item.description}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0b1328] px-4 py-3">
            <p className="text-center text-[10px] font-medium text-ink-subtle">Figuelovers · Observatorio de grafos</p>
          </div>
        </div>
      )}
    </div>
  );
};