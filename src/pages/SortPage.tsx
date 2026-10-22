import {
  ChartNoAxesColumn,
  Check,
  Dices,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { BackButton } from '../components/BackButton';
import { Sidebar } from '../components/Sidebar';
import { SortWorkbench } from '../components/SortWorkbench';
import { useSortStore } from '../store/useSortStore';
import { Button, IconButton } from '../ui';
import { SORT_ALGORITHMS } from '../utils/sortEngine';

/**
 * Sección Sort.
 *
 * La escena es una sola idea: el arreglo es una constelación de columnas
 * de luz y ordenarlo es reacomodarla. Cada paso del motor trae el orden
 * completo y el foco (compara / mueve / mínimo / levantado / resuelto),
 * así que el player solo cambia `cursor`: pausar, retroceder y arrastrar
 * el progreso son instantáneos y nunca recalculan el algoritmo.
 *
 * Las barras se posicionan con `translateX(index * 100%)` sobre ranuras
 * de igual ancho, no con `left`: el movimiento es una transformación y
 * una barra que se intercambia es la MISMA barra viajando de ranura.
 * El tiempo de la transición se ata al de la velocidad para que cada
 * paso termine de asentarse justo antes del siguiente.
 */

const BASE_STEP_MS = 300;

const SortPage: React.FC = () => {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('from') ?? '/editor';

  const {
    algorithm,
    speed,
    items,
    steps,
    cursor,
    playing,
    setSpeed,
    setCursor,
    stepBy,
    advance,
    togglePlay,
    resetRun,
    generateRandom,
  } = useSortStore();

  const step = steps[cursor] ?? null;
  const total = steps.length;
  const hasItems = items.length > 0 && total > 0;
  const complete = hasItems && cursor >= total - 1;
  // `playing` queda en true al llegar al final; la página lo deriva a false
  // para que el botón vuelva a decir "Repetir" sin escribir estado en un effect.
  const isPlaying = playing && !complete;

  const info = SORT_ALGORITHMS.find((entry) => entry.id === algorithm) ?? SORT_ALGORITHMS[0];
  const valuesById = useMemo(
    () => new Map(items.map((item) => [item.id, item.value])),
    [items]
  );
  const maxValue = useMemo(
    () => Math.max(1, ...items.map((item) => item.value)),
    [items]
  );

  const stepDelay = Math.round(Math.min(700, Math.max(45, BASE_STEP_MS / speed)));

  // El reloj solo pide avanzar; el store decide hasta dónde llegar y las
  // acciones manuales (paso, scrub, reinicio) pausan la reproducción.
  useEffect(() => {
    if (!isPlaying || total === 0) return;

    const timer = window.setTimeout(() => advance(), stepDelay);
    return () => window.clearTimeout(timer);
  }, [isPlaying, cursor, total, stepDelay, advance]);

  const moveBy = (delta: number): void => {
    stepBy(delta);
  };

  const restart = (): void => {
    resetRun();
  };

  const showAllLabels = items.length <= 24;
  const slotWidth = 100 / Math.max(1, items.length);
  const sortedSet = new Set(step?.sorted ?? []);
  const comparingSet = new Set(step?.comparing ?? []);
  const movingSet = new Set(step?.moving ?? []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto text-ink md:flex-row md:overflow-hidden">
      <main className="flex w-full min-w-0 flex-col gap-4 p-5 md:min-h-0 md:flex-1 md:overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BackButton to={returnTo} />
          <div className="min-w-0">
            <p className="eyebrow text-[10px]">Algoritmos de ordenamiento</p>
            <h1 className="mt-1 font-display text-xl font-extrabold leading-tight">Ordenar en barras</h1>
          </div>
          <span className="ml-auto hidden font-mono text-xs uppercase tracking-widest text-ink-subtle sm:inline">
            Algoritmos · sort
          </span>
        </div>

        <section className="sort-panel glass-panel flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-2xl md:min-h-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
            <Button
              type="button"
              onClick={togglePlay}
              disabled={!hasItems || total <= 1}
              leftIcon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            >
              {isPlaying ? 'Pausar' : complete ? 'Repetir' : 'Reproducir'}
            </Button>

            <IconButton
              aria-label="Paso anterior"
              title="Paso anterior"
              size="md"
              variant="secondary"
              disabled={!hasItems || cursor <= 0}
              onClick={() => moveBy(-1)}
            >
              <SkipBack className="h-4 w-4" />
            </IconButton>

            <IconButton
              aria-label="Paso siguiente"
              title="Paso siguiente"
              size="md"
              variant="secondary"
              disabled={!hasItems || complete}
              onClick={() => moveBy(1)}
            >
              <SkipForward className="h-4 w-4" />
            </IconButton>

            <IconButton
              aria-label="Reiniciar animación"
              title="Reiniciar animación"
              size="md"
              variant="secondary"
              disabled={!hasItems || cursor === 0}
              onClick={restart}
            >
              <RotateCcw className="h-4 w-4" />
            </IconButton>

            <div className="flex-1" />

            <span className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle lg:inline-flex">
              <ChartNoAxesColumn className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
              {info.label} · {info.complexity}
            </span>

            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
              <Gauge className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                aria-label="Velocidad de la animación"
                className="sort-range w-24"
              />
              <span className="w-9 text-right font-mono text-[11px] tabular-nums text-ink-muted">
                {speed.toFixed(1)}×
              </span>
            </div>
          </div>

          {hasItems && step ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-ink-subtle">
                  Paso {String(cursor + 1).padStart(3, '0')} / {String(total).padStart(3, '0')}
                </span>

                <p className="min-w-0 flex-1 truncate text-xs text-ink-muted" aria-live="polite">
                  {step.note}
                </p>

                {complete && (
                  <span
                    role="status"
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Ordenado
                  </span>
                )}

                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                  <span>
                    Comp.
                    <strong className="ml-1.5 font-medium tabular-nums text-ink">{step.comparisons}</strong>
                  </span>
                  <span>
                    Cambios
                    <strong className="ml-1.5 font-medium tabular-nums text-ink">{step.swaps}</strong>
                  </span>
                </div>
              </div>

              <div className={`sort-stage relative min-h-[300px] flex-1 overflow-hidden ${complete ? 'is-complete' : ''}`}>
                <div className="field-stars pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

                <div className="sort-plot">
                  <div
                    className="sort-bars"
                    role="img"
                    aria-label={`Barras del ordenamiento en el paso ${cursor + 1} de ${total}`}
                    style={{ '--sort-duration': `${stepDelay}ms` } as React.CSSProperties}
                  >
                    {step.order.map((id, index) => {
                      const value = valuesById.get(id) ?? 0;
                      const height = Math.max(5, (value / maxValue) * 88);
                      const state = step.lifted === id
                        ? 'lifted'
                        : movingSet.has(id)
                          ? 'moving'
                          : comparingSet.has(id)
                            ? 'comparing'
                            : step.candidate === id
                              ? 'candidate'
                              : sortedSet.has(id)
                                ? 'sorted'
                                : 'idle';
                      const showLabel = showAllLabels || state !== 'idle';

                      return (
                        <div
                          key={id}
                          className="sort-slot"
                          style={{ width: `${slotWidth}%`, transform: `translateX(${index * 100}%)` }}
                        >
                          <div
                            className={`sort-bar ${complete ? 'sort-bar--complete' : ''}`}
                            data-state={state}
                            style={{
                              '--bar-height': `${height}%`,
                              '--bar-index': index,
                            } as React.CSSProperties}
                          >
                            {showLabel && <span className="sort-bar-value">{value}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="sort-ticks"
                    style={{ backgroundSize: `${slotWidth}% 100%` }}
                    aria-hidden="true"
                  />
                  <div className="sort-baseline" aria-hidden="true" />
                </div>

                {complete && <div className="sort-complete-glow pointer-events-none" aria-hidden="true" />}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-2.5">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, total - 1)}
                  value={cursor}
                  onChange={(event) => {
                    setCursor(Number(event.target.value));
                  }}
                  aria-label="Progreso del ordenamiento"
                  className="sort-range min-w-32 flex-1"
                />

                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-subtle">
                  <span className="flex items-center gap-1.5">
                    <span className="sort-key bg-[#ffd684]" /> Compara
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="sort-key bg-[#c4b5fd]" /> Mueve
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="sort-key bg-[#8ecbff]" /> Clave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="sort-key bg-[#5fe3da]" /> Ordenado
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="field-stars pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-300/10 text-sky-200 shadow-[0_0_40px_rgba(142,203,255,0.14)]">
                <ChartNoAxesColumn className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="relative">
                <p className="font-display text-base font-bold text-ink">Todavía no hay números</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                  Cargá una lista en el panel Sort o generá una al azar para ver la animación.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => generateRandom(16)}
                leftIcon={<Dices className="h-4 w-4" />}
                className="relative"
              >
                Generar 16 al azar
              </Button>
            </div>
          )}
        </section>
      </main>

      <Sidebar
        workbench={{
          icon: ChartNoAxesColumn,
          title: 'Sort',
          subtitle: 'Burbuja, selección e inserción',
          iconClassName: 'bg-sky-300/10 text-sky-200',
        }}
      >
        <SortWorkbench />
      </Sidebar>
    </div>
  );
};

export default SortPage;
