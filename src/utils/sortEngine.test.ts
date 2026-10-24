import { describe, expect, it } from 'vitest';

import {
  buildSortSteps,
  SORT_ALGORITHMS,
  toSortItems,
  type SortAlgorithm,
  type SortStep,
} from './sortEngine';

const valueOf = (values: number[], id: string): number =>
  values[Number(id.replace('item-', ''))];

const valuesInOrder = (step: SortStep, values: number[]): number[] =>
  step.order.map((id) => valueOf(values, id));

const stepsFor = (values: number[], algorithm: SortAlgorithm): SortStep[] =>
  buildSortSteps(toSortItems(values), algorithm);

const ALGORITHMS: SortAlgorithm[] = SORT_ALGORITHMS.map((item) => item.id);

describe('sortEngine', () => {
  it.each(ALGORITHMS)('%s termina con todos los números ordenados', (algorithm) => {
    const values = [9, 4, 7, 1, 8, 2, 6, 3, 5];
    const steps = stepsFor(values, algorithm);
    const last = steps[steps.length - 1];

    expect(valuesInOrder(last, values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(last.sorted).toHaveLength(values.length);
    expect(last.comparing).toHaveLength(0);
    expect(last.moving).toHaveLength(0);
    expect(last.lifted).toBeNull();
  });

  it.each(ALGORITHMS)('%s conserva los mismos elementos en cada paso', (algorithm) => {
    const values = [5, 3, 3, 8, 1];
    const steps = stepsFor(values, algorithm);

    for (const step of steps) {
      expect(step.order).toHaveLength(values.length);
      expect(new Set(step.order).size).toBe(values.length);
      expect(valuesInOrder(step, values).sort((a, b) => a - b)).toEqual([1, 3, 3, 5, 8]);
    }
  });

  it('burbuja marca el extremo derecho como resuelto pasada a pasada', () => {
    const values = [4, 1, 3, 2];
    const steps = stepsFor(values, 'bubble');
    const sortedCounts = steps.map((step) => step.sorted.length);

    expect(sortedCounts[0]).toBe(0);
    expect(sortedCounts[sortedCounts.length - 1]).toBe(values.length);
    expect(sortedCounts.every((count, index) => index === 0 || count >= sortedCounts[index - 1])).toBe(true);
    expect(steps.some((step) => step.moving.length === 2)).toBe(true);
  });

  it('selección mantiene un candidato a mínimo y lo informa', () => {
    const steps = stepsFor([7, 2, 9, 1], 'selection');

    expect(steps.some((step) => step.candidate !== null)).toBe(true);
    expect(steps.some((step) => step.note.startsWith('Nuevo mínimo'))).toBe(true);
  });

  it('inserción levanta la clave y la vuelve a apoyar', () => {
    const steps = stepsFor([5, 2, 4, 1], 'insertion');

    expect(steps.some((step) => step.lifted !== null && step.note.includes('Tomamos'))).toBe(true);
    expect(steps.some((step) => step.lifted !== null && step.comparing.length === 2)).toBe(true);
    expect(steps.some((step) => step.lifted !== null && step.moving.length === 2)).toBe(true);
    expect(steps[steps.length - 1].lifted).toBeNull();
  });

  it('burbuja corta antes cuando la lista ya está ordenada', () => {
    const steps = stepsFor([1, 2, 3, 4], 'bubble');
    const last = steps[steps.length - 1];

    expect(last.swaps).toBe(0);
    // Una sola pasada de 3 comparaciones: no recorre las cuatro.
    expect(last.comparisons).toBe(3);
    expect(last.note).toContain('Listo');
  });

  it('ordena valores repetidos sin perder elementos', () => {
    const values = [3, 1, 2, 1, 3];
    const steps = stepsFor(values, 'insertion');

    expect(valuesInOrder(steps[steps.length - 1], values)).toEqual([1, 1, 2, 3, 3]);
  });

  it('con un solo elemento no inventa comparaciones', () => {
    const steps = stepsFor([42], 'bubble');
    const last = steps[steps.length - 1];

    expect(last.comparisons).toBe(0);
    expect(last.swaps).toBe(0);
    expect(last.sorted).toHaveLength(1);
  });
});
