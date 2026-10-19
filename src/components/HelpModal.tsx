import { ArrowRightLeft, ChevronDown, Crosshair, GitBranch, HelpCircle, Keyboard, MousePointerClick, Orbit, Plus, Route, Sparkles, Trash2, Truck } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui';
import { EDITOR_EVENTS } from '../lib/editorEvents';
import { useEditorEvent } from '../hooks/useEditorEvent';

interface HelpItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail?: string;
  accent?: 'brand' | 'error';
}

/**
 * Atajos del lienzo. La fuente de verdad del mapeo es GraphToolbar
 * (tecla junto a cada boton); esto es solo la vista impresa.
 */
const SHORTCUTS: { key: string; label: string }[] = [
  { key: 'Q', label: 'Interactuar' },
  { key: 'W', label: 'Conectar' },
  { key: 'E', label: 'Añadir nodo' },
  { key: 'P', label: 'Eliminar' },
  { key: 'H', label: 'Abrir esta ayuda' },
  { key: 'O', label: 'Limpiar todo' },
  { key: 'Esc', label: 'Volver a Interactuar' },
];

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
    description: 'Activa Añadir nodo: el cursor se convierte en un + y la estrella nace exactamente donde hagas clic. En modo Interactuar, el doble clic sobre el lienzo vacío también crea una estrella.',
  },
  {
    icon: <ArrowRightLeft className="h-4 w-4" />,
    title: 'Editar aristas',
    description: 'Selecciona una arista para cambiar su peso, quitar su dirección o invertirla.',
  },
  {
    icon: <Trash2 className="h-4 w-4" />,
    title: 'Eliminar',
    description: 'Activa Eliminar: el cursor se convierte en una × y, al hacer clic en una estrella o en una conexión, aparece la confirmación de ese elemento. Un único botón sirve para los dos.',
    accent: 'error',
  },
];

const ALGORITHM_ITEMS: HelpItem[] = [
  {
    icon: <Route className="h-4 w-4" />,
    title: 'Rutas interestelares (Johnson)',
    description: 'Calcula distancias y caminos mínimos entre todos los pares de nodos.',
    detail: 'Todas las aristas deben ser dirigidas. El servicio añade una fuente artificial y ejecuta Bellman–Ford para detectar ciclos negativos y obtener potenciales. Después repondera las aristas y ejecuta Dijkstra desde cada nodo para reconstruir distancias y caminos. ∞ significa que no existe un camino; un aviso de ciclo negativo indica que no se pueden definir distancias mínimas. Consulta la matriz de distancias y elige origen y destino para ver el camino correspondiente.',
  },
  {
    icon: <Crosshair className="h-4 w-4" />,
    title: 'Comando de misión (Asignación húngara)',
    description: 'Busca una asignación de costo mínimo o beneficio máximo entre filas y columnas.',
    detail: 'Al traducir un grafo, las aristas dirigidas completan [origen][destino] y las no dirigidas completan ambos sentidos. Las celdas sin conexión empiezan en 0 y deben revisarse: no significan rutas prohibidas. Para maximizar, cada valor se transforma como máximo − valor. Las matrices rectangulares se cuadran con filas o columnas ficticias y el límite es 20 × 20. Los pasos muestran las reducciones y el ajuste de ceros; son una traza didáctica, mientras que la asignación final se obtiene con el solver de asignación lineal.',
  },
  {
    icon: <Truck className="h-4 w-4" />,
    title: 'Esquina Noroeste (transporte)',
    description: 'Construye una solución inicial de transporte comenzando por la celda superior izquierda.',
    detail: 'Asigna roles de origen/destino y completa sus ofertas/demandas; los roles se pueden inferir de las aristas o cambiar manualmente. El método asigna el mínimo entre oferta y demanda restantes y avanza al cerrar una fila o columna. El campo was_balanced indica si los totales originales coincidían antes de cualquier ajuste; si no coinciden, se agrega un origen o destino ficticio de costo cero, identificado en dummy. Si se agotan ambos a la vez, se marca una celda básica degenerada con asignación cero. Una celda sin arista es una ruta bloqueada (se muestra —), no costo cero: si recibe cantidad, el resultado se marca NO FACTIBLE. Esta solución inicial no necesariamente minimiza el costo.',
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: 'Árboles binarios de búsqueda',
    description: 'Inserta valores separados por coma o genera valores aleatorios para construir y recorrer un ABB.',
    detail: 'En un ABB, los valores menores se insertan a la izquierda y los mayores a la derecha. Pre-order visita raíz–izquierda–derecha; in-order, izquierda–raíz–derecha; post-order, izquierda–derecha–raíz (para la raíz 2 con hijos 1 y 3: 2,1,3; 1,2,3; 1,3,2). También puedes cargar el árbol desde el grafo del editor; si ese grafo no cumple la propiedad de búsqueda, se conserva como árbol binario general. Se guarda en el grafo como aristas dirigidas padre→hijo y metadatos treeValue/treeSide en node.data, así se conserva al guardar/exportar el proyecto.',
  },
];

const UNIVERSE_ITEMS: HelpItem[] = [
  { icon: <Orbit className="h-4 w-4" />, title: 'Universo observable', description: 'La marca y el punto de entrada a toda la experiencia.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Red cósmica', description: 'El dashboard donde cada galaxia representa un proyecto guardado localmente.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Galaxia y constelación', description: 'Una galaxia es un proyecto; su constelación es el grafo formado por estrellas y líneas. No confundir con «Constelaciones», la sección de figuras reales del cielo.' },
  { icon: <Orbit className="h-4 w-4" />, title: 'Rutas y misiones', description: 'Las conexiones representan viajes y la asignación representa recursos enviados a destinos planetarios.' },
];

/**
 * Qué son y qué se puede hacer con una constelación. Va desplegable como
 * los algoritmos porque es el unico tema que rompe una regla del editor
 * (la forma no se toca) y esa regla necesita explicación, no asumirla.
 */
const CONSTELLATION_DETAIL: React.ReactNode = (
  <>
    <p>
      Son plantillas de figuras reales del cielo (Orión, Osa Mayor, Casiopea…) que viven
      en <code className="font-mono text-ink">public/constellations/</code> y se abren
      desde la sección <strong>Constelaciones</strong>. Al abrirlas se COPIAN a un
      proyecto propio: por eso el archivo original nunca se toca y puedes experimentar
      sin miedo a romper la figura.
    </p>
    <p className="mt-2">
      <strong className="text-ink">La forma es fija</strong>: no se pueden agregar,
      mover ni eliminar estrellas, ni crear ni eliminar conexiones. Es lo que hace que
      la figura siga siendo reconocible; el bloqueo vive en el estado del editor, no solo
      en los botones.
    </p>
    <p className="mt-2">
      <strong className="text-ink">Sí puedes</strong>: renombrar cada estrella, cambiar
      el peso de cada conexión, marcar todas como dirigidas (o quitarles la dirección)
      con los botones del editor, invertir una arista y definir los datos que usan los
      algoritmos (roles, oferta y demanda).
    </p>
    <p className="mt-2">
      <strong className="text-ink">Con los algoritmos</strong>: Johnson exige aristas
      dirigidas, así que usa «Todas dirigidas» antes de entrar a Rutas interestelares.
      Asignación, Esquina Noroeste y las matrices usan los pesos y los roles que definas.
      Si te equivocaste, <strong className="text-ink">Restaurar original</strong> en el
      editor devuelve la plantilla completa (forma, pesos y nombres).
    </p>
    <p className="mt-2">
      Se exportan como un JSON normal: si lo importás en un lienzo libre, el grafo deja
      de estar protegido y puedes editarlo como cualquier otro.
    </p>
  </>
);

export const HelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedAlgorithm, setExpandedAlgorithm] = useState<number | null>(null);
  const [isConstellationOpen, setIsConstellationOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Atajo H del lienzo: alterna la ayuda sin importar donde este el mouse.
  useEditorEvent(EDITOR_EVENTS.openHelp, () => setIsOpen((current) => !current));

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
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95"
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
            <p className="eyebrow mb-3 mt-6 text-[9px]">02 · atajos de teclado</p>
            <div className="space-y-1.5">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[11px] text-ink-muted">
                    <Keyboard aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="truncate">{shortcut.label}</span>
                  </span>
                  <kbd className="shrink-0 rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="eyebrow mb-3 mt-6 text-[9px]">03 · constelaciones</p>
            <div className="overflow-hidden rounded-xl border border-mission/25 bg-mission/[0.07]">
              <button
                type="button"
                aria-expanded={isConstellationOpen}
                aria-controls="constellation-help-detail"
                onClick={() => setIsConstellationOpen((current) => !current)}
                className="flex w-full items-start gap-3 p-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mission/15 text-mission">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-ink">Constelaciones famosas</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                    Plantillas de figuras reales del cielo, con la forma fija: renombrar
                    estrellas y editar pesos sí; cambiar la figura no.
                  </span>
                </span>
                <ChevronDown className={`mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${isConstellationOpen ? 'rotate-180' : ''}`} />
              </button>
              {isConstellationOpen && (
                <div
                  id="constellation-help-detail"
                  className="border-t border-mission/20 px-4 py-3 pl-14 text-[11px] leading-relaxed text-ink-muted"
                >
                  {CONSTELLATION_DETAIL}
                </div>
              )}
            </div>
            <p className="eyebrow mb-3 mt-6 text-[9px]">04 · algoritmos</p>
            <div className="space-y-3">
              {ALGORITHM_ITEMS.map((item, index) => {
                const expanded = expandedAlgorithm === index;
                const detailId = `algorithm-help-detail-${index}`;
                return (
                  <div key={`algorithm-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={detailId}
                      onClick={() => setExpandedAlgorithm((current) => current === index ? null : index)}
                      className="flex w-full items-start gap-3 p-3 text-left"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold text-ink">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">{item.description}</span>
                      </span>
                      <ChevronDown className={`mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div id={detailId} className="border-t border-white/10 px-4 py-3 pl-14 text-[11px] leading-relaxed text-ink-muted">
                        {item.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="eyebrow mb-3 mt-6 text-[9px]">05 · conceptos del universo</p>
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