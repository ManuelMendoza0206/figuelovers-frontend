import { create } from 'zustand';

import {
  buildSortSteps,
  MAX_SORT_VALUES,
  MIN_SORT_VALUES,
  SORT_SAMPLE_VALUES,
  toSortItems,
  type SortAlgorithm,
  type SortItem,
  type SortStep,
} from '../utils/sortEngine';

/**
 * Estado de la sección Sort que sobrevive a la navegación.
 *
 * Guarda la lista, el algoritmo elegido, la velocidad y el paso actual.
 * Los pasos NO se calculan en la página: se calculan acá una sola vez
 * cada vez que cambia el algoritmo o la lista, y el player solo mueve
 * `cursor`. Así pausar, retroceder o arrastrar el progreso no vuelve a
 * ordenar nada.
 */

const RANDOM_MIN = 5;
const RANDOM_MAX = 99;
const MIN_SPEED = 0.5;
const MAX_SPEED = 6;

/** Contador de tandas: cada lista nueva entra con su propia animación. */
let runId = 0;

const nextItems = (values: number[]): SortItem[] => {
  runId += 1;
  return toSortItems(values, `run-${runId}`);
};

const randomValues = (count: number): number[] => {
  const pool = Array.from(
    { length: RANDOM_MAX - RANDOM_MIN + 1 },
    (_, index) => RANDOM_MIN + index
  );

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapWith]] = [pool[swapWith], pool[index]];
  }

  return pool.slice(0, count);
};

const clampSpeed = (speed: number): number =>
  Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));

const clampCursor = (cursor: number, steps: SortStep[]): number =>
  Math.min(Math.max(0, cursor), Math.max(0, steps.length - 1));

const initialItems = toSortItems(SORT_SAMPLE_VALUES, 'sample');

interface SortState {
  algorithm: SortAlgorithm;
  speed: number;
  items: SortItem[];
  steps: SortStep[];
  cursor: number;
  playing: boolean;

  setAlgorithm: (algorithm: SortAlgorithm) => void;
  setSpeed: (speed: number) => void;
  setValues: (values: number[]) => void;
  generateRandom: (count: number) => void;
  clear: () => void;
  setCursor: (cursor: number) => void;
  stepBy: (delta: number) => void;
  advance: () => void;
  togglePlay: () => void;
  resetRun: () => void;
}

export const useSortStore = create<SortState>((set) => ({
  algorithm: 'bubble',
  speed: 2,
  items: initialItems,
  steps: buildSortSteps(initialItems, 'bubble'),
  cursor: 0,
  playing: false,

  setAlgorithm: (algorithm) => set((state) => ({
    algorithm,
    steps: buildSortSteps(state.items, algorithm),
    cursor: 0,
    playing: false,
  })),

  setSpeed: (speed) => set({ speed: clampSpeed(speed) }),

  setValues: (values) => set((state) => {
    const items = nextItems(values);
    return {
      items,
      steps: buildSortSteps(items, state.algorithm),
      cursor: 0,
      playing: false,
    };
  }),

  generateRandom: (count) => set((state) => {
    const safeCount = Math.min(
      MAX_SORT_VALUES,
      Math.max(MIN_SORT_VALUES, Math.floor(count) || MIN_SORT_VALUES)
    );
    const items = nextItems(randomValues(safeCount));
    return {
      items,
      steps: buildSortSteps(items, state.algorithm),
      cursor: 0,
      playing: false,
    };
  }),

  clear: () => set({ items: [], steps: [], cursor: 0, playing: false }),

  setCursor: (cursor) => set((state) => ({
    cursor: clampCursor(cursor, state.steps),
    playing: false,
  })),

  stepBy: (delta) => set((state) => ({
    cursor: clampCursor(state.cursor + delta, state.steps),
    playing: false,
  })),

  /** Avance del reloj: NO pausa, a diferencia de un paso manual. */
  advance: () => set((state) => ({
    cursor: clampCursor(state.cursor + 1, state.steps),
  })),

  /**
   * Reproducir / pausar. Al llegar al final, `playing` puede quedar en
   * true mientras la página lo deriva a false; por eso acá se mira el
   * cursor y no solo el flag: volver a tocar en el final reinicia.
   */
  togglePlay: () => set((state) => {
    if (state.steps.length <= 1) return state;

    const atEnd = state.cursor >= state.steps.length - 1;
    if (state.playing && !atEnd) return { playing: false };

    return { playing: true, cursor: atEnd ? 0 : state.cursor };
  }),

  resetRun: () => set({ cursor: 0, playing: false }),
}));
