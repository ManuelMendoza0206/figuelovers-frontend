import {
  ArrowLeftRight,
  Check,
  CornerDownRight,
  Crosshair,
  Dices,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useState } from 'react';

import { useSortStore } from '../store/useSortStore';
import {
  MAX_SORT_VALUE,
  MAX_SORT_VALUES,
  MIN_SORT_VALUE,
  MIN_SORT_VALUES,
  SORT_ALGORITHMS,
  type SortAlgorithm,
} from '../utils/sortEngine';
import { Button } from '../ui';

/**
 * Panel del sidebar en /sort. Es el dueño de la entrada de datos y de la
 * elección de algoritmo; la escena de barras solo mira el store.
 *
 * A diferencia de árboles, acá una tanda REEMPLAZA la lista: ordenar
 * bloques sueltos no tiene sentido, y comparar el antes/después exige
 * una sola lista con un solo comienzo.
 */

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20';

const ALGORITHM_ICONS: Record<SortAlgorithm, LucideIcon> = {
  bubble: ArrowLeftRight,
  selection: Crosshair,
  insertion: CornerDownRight,
};

const RANDOM_PRESETS = [8, 16, 24, 32];

type ParseResult =
  | { ok: true; values: number[] }
  | { ok: false; reason: string };

/**
 * "42, 7, 15" → [42, 7, 15]. Acepta comas o espacios como separadores.
 * Los repetidos SÍ se permiten: ordenar duplicados también es parte del
 * ejercicio, y el motor los conserva.
 */
const parseValuesInput = (input: string): ParseResult => {
  const tokens = input
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { ok: false, reason: `Ingresá al menos ${MIN_SORT_VALUES} números enteros.` };
  }

  if (tokens.length < MIN_SORT_VALUES) {
    return { ok: false, reason: `Ingresá al menos ${MIN_SORT_VALUES} números para poder comparar.` };
  }

  if (tokens.length > MAX_SORT_VALUES) {
    return { ok: false, reason: `El máximo es ${MAX_SORT_VALUES} números.` };
  }

  const values: number[] = [];

  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      return { ok: false, reason: `“${token}” no es un número entero.` };
    }

    const value = Number(token);
    if (!Number.isSafeInteger(value) || value < MIN_SORT_VALUE || value > MAX_SORT_VALUE) {
      return {
        ok: false,
        reason: `Usá enteros entre ${MIN_SORT_VALUE} y ${MAX_SORT_VALUE}.`,
      };
    }

    values.push(value);
  }

  return { ok: true, values };
};

export const SortWorkbench: React.FC = () => {
  const {
    algorithm,
    items,
    setAlgorithm,
    setValues,
    generateRandom,
    clear,
  } = useSortStore();

  const [mode, setMode] = useState<'manual' | 'random'>('manual');
  const [valuesInput, setValuesInput] = useState('');
  const [countInput, setCountInput] = useState('16');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyValues = (): void => {
    const parsed = parseValuesInput(valuesInput);
    if (!parsed.ok) {
      setErrorMessage(parsed.reason);
      return;
    }

    setValues(parsed.values);
    setValuesInput('');
    setErrorMessage(null);
  };

  const randomize = (count = Number(countInput)): void => {
    if (!Number.isInteger(count) || count < MIN_SORT_VALUES || count > MAX_SORT_VALUES) {
      setErrorMessage(`Indicá una cantidad entera entre ${MIN_SORT_VALUES} y ${MAX_SORT_VALUES}.`);
      return;
    }

    generateRandom(count);
    setCountInput(String(count));
    setErrorMessage(null);
  };

  const switchMode = (nextMode: 'manual' | 'random'): void => {
    setMode(nextMode);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-5">
      <section>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Algoritmo
        </p>
        <div className="mt-2 space-y-2">
          {SORT_ALGORITHMS.map(({ id, label, blurb, complexity, stable }) => {
            const Icon = ALGORITHM_ICONS[id];
            const isActive = algorithm === id;

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => { setAlgorithm(id); setErrorMessage(null); }}
                className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-brand/45 bg-brand/[0.07]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? 'bg-brand/15 text-brand'
                      : 'bg-white/[0.04] text-ink-subtle group-hover:text-ink-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isActive ? 'text-ink' : 'text-ink-muted'}`}>
                      {label}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">{blurb}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
                    {complexity} · {stable ? 'estable' : 'inestable'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border" />

      <section>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Datos
        </p>

        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-muted p-1">
          <button
            type="button"
            aria-pressed={mode === 'manual'}
            onClick={() => switchMode('manual')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'manual' ? 'bg-brand text-[#07101f]' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            aria-pressed={mode === 'random'}
            onClick={() => switchMode('random')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'random' ? 'bg-brand text-[#07101f]' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Aleatorio
          </button>
        </div>

        {mode === 'manual' ? (
          <div className="mt-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-ink-muted">Números para ordenar</span>
              <input
                id="sort-numbers-input"
                type="text"
                inputMode="numeric"
                value={valuesInput}
                onChange={(event) => setValuesInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyValues();
                  }
                }}
                placeholder="Ej. 42, 8, 73, 26"
                autoComplete="off"
                className={FIELD_CLASS}
              />
            </label>
            <p className="text-[11px] leading-4 text-ink-muted">
              Separá con comas o espacios. Se permiten repetidos; máximo {MAX_SORT_VALUES}.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={applyValues}
                className="flex-1"
                leftIcon={<ListOrdered className="h-4 w-4" />}
              >
                Aplicar lista
              </Button>
              <Button
                type="button"
                onClick={() => { clear(); setValuesInput(''); setErrorMessage(null); }}
                variant="secondary"
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Vaciar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-ink-muted">Cantidad de números</span>
              <input
                type="number"
                min={MIN_SORT_VALUES}
                max={MAX_SORT_VALUES}
                value={countInput}
                onChange={(event) => setCountInput(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {RANDOM_PRESETS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-label={`Generar ${count} números`}
                  onClick={() => randomize(count)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-ink-muted transition hover:border-brand/30 hover:text-brand"
                >
                  {count}
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={() => randomize()}
              fullWidth
              leftIcon={<Dices className="h-4 w-4" />}
            >
              Generar números
            </Button>
            <p className="text-[11px] leading-4 text-ink-muted">
              Valores únicos entre 5 y 99 para que las barras se distingan.
            </p>
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      <section>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
            Números actuales
          </p>
          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-ink-subtle">
            {items.length}/{MAX_SORT_VALUES}
          </span>
        </div>

        {items.length > 0 ? (
          <p className="mt-2 max-h-24 overflow-y-auto rounded-xl border border-border/60 bg-surface-muted px-3 py-2 font-mono text-xs leading-5 text-ink">
            {items.map((item) => item.value).join(', ')}
          </p>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs leading-5 text-ink-muted">
            Sin números cargados. Aplicá una lista o generá una al azar.
          </p>
        )}

        <p className="mt-2 text-[11px] leading-4 text-ink-muted">
          La lista, el algoritmo y la velocidad se conservan al cambiar de sección.
        </p>
      </section>

      {errorMessage && (
        <p role="alert" className="rounded-xl border border-red-300/30 bg-red-900/20 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
