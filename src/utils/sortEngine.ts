/**
 * Motor de los cinco ordenamientos de la sección Sort.
 *
 * El motor es puro: recibe los números y devuelve una lista de PASOS, no
 * toca React ni el DOM. Cada paso es una foto completa del arreglo (ids
 * en su orden actual) más el foco didáctico: qué se compara, qué se
 * mueve, qué ya quedó en su lugar y, en inserción, qué elemento está
 * levantado.
 *
 * La animación no reconstruye el algoritmo: solo recorre estas fotos.
 * Por eso el player puede pausar, retroceder y arrastrar el progreso sin
 * recalcular nada, y por eso los tests pueden verificar el orden final
 * sin montar la página.
 *
 * Los ids son estables por elemento (no por posición) para que una barra
 * que se intercambia sea la MISMA barra viajando a otra ranura: eso es
 * lo que hace que el movimiento se lea como un intercambio y no como un
 * cambio de alturas.
 */

export type SortAlgorithm = 'bubble' | 'selection' | 'insertion' | 'shell' | 'merge';

/** Sentido del ordenamiento: de menor a mayor o de mayor a menor. */
export type SortDirection = 'asc' | 'desc';

export interface SortItem {
  id: string;
  value: number;
}

export interface SortStep {
  /** Ids en el orden visible del arreglo en este paso. */
  order: string[];
  /** Hasta dos ids que se están comparando. */
  comparing: string[];
  /** Ids que se están intercambiando en este paso. */
  moving: string[];
  /** Ids que ya alcanzaron su posición definitiva. */
  sorted: string[];
  /** Elemento levantado del arreglo (inserción). */
  lifted: string | null;
  /** Mínimo provisorio de selección. */
  candidate: string | null;
  /** Frase en español que describe el paso. */
  note: string;
  comparisons: number;
  swaps: number;
}

export interface SortAlgorithmInfo {
  id: SortAlgorithm;
  label: string;
  blurb: string;
  complexity: string;
  stable: boolean;
}

export const SORT_ALGORITHMS: SortAlgorithmInfo[] = [
  {
    id: 'bubble',
    label: 'Burbuja',
    blurb: 'Compara vecinos y empuja el extremo del orden al final de cada pasada.',
    complexity: 'O(n²)',
    stable: true,
  },
  {
    id: 'selection',
    label: 'Selección',
    blurb: 'Busca el extremo restante y lo lleva al frente.',
    complexity: 'O(n²)',
    stable: false,
  },
  {
    id: 'insertion',
    label: 'Inserción',
    blurb: 'Toma cada número y lo inserta en la parte ya ordenada.',
    complexity: 'O(n²)',
    stable: true,
  },
  {
    id: 'shell',
    label: 'Shell',
    blurb: 'Ordena por saltos decrecientes y termina con inserción.',
    complexity: 'O(n²)',
    stable: false,
  },
  {
    id: 'merge',
    label: 'Merge',
    blurb: 'Divide la lista, ordena mitades y las combina.',
    complexity: 'O(n log n)',
    stable: true,
  },
];

export const MIN_SORT_VALUES = 2;
export const MAX_SORT_VALUES = 40;
export const MIN_SORT_VALUE = 1;
export const MAX_SORT_VALUE = 999;

/** Valores de la primera visita: la escena arranca con algo para mostrar. */
export const SORT_SAMPLE_VALUES = [
  42, 8, 73, 26, 61, 15, 88, 34, 57, 3, 69, 47, 92, 21, 80, 12,
];

interface StepExtras {
  comparing?: string[];
  moving?: string[];
  sorted?: string[];
  lifted?: string | null;
  candidate?: string | null;
  note: string;
}

/**
 * Crea los elementos con ids estables. El prefijo separa una tanda de
 * otra: la página lo usa como `key` de la escena para que una lista
 * nueva entre con su propia animación en vez de mutar las barras viejas.
 */
export const toSortItems = (
  values: number[],
  idPrefix = 'item'
): SortItem[] => values.map((value, index) => ({
  id: `${idPrefix}-${index}`,
  value,
}));

const directionPhrase = (direction: SortDirection): string =>
  direction === 'asc' ? 'menor a mayor' : 'mayor a menor';

const extremumLabel = (direction: SortDirection): string =>
  direction === 'asc' ? 'mínimo' : 'máximo';

const swapSymbol = (direction: SortDirection): string =>
  direction === 'asc' ? '>' : '<';

const candidateSymbol = (direction: SortDirection): string =>
  direction === 'asc' ? '<' : '>';

const shouldSwap = (
  left: number,
  right: number,
  direction: SortDirection
): boolean => (direction === 'asc' ? left > right : left < right);

const isBetterCandidate = (
  candidate: number,
  current: number,
  direction: SortDirection
): boolean => (direction === 'asc' ? candidate < current : candidate > current);

const shouldShift = (
  neighbour: number,
  key: number,
  direction: SortDirection
): boolean => (direction === 'asc' ? neighbour > key : neighbour < key);

const mergeInOrder = (
  left: number,
  right: number,
  direction: SortDirection
): boolean => (direction === 'asc' ? left <= right : left >= right);

/**
 * Devuelve la lista de pasos del algoritmo elegido. El primer paso es el
 * estado inicial y el último siempre tiene todos los ids en `sorted`.
 * Por defecto ordena de menor a mayor; `direction` invierte todas las
 * comparaciones sin duplicar el motor.
 */
export const buildSortSteps = (
  source: SortItem[],
  algorithm: SortAlgorithm,
  direction: SortDirection = 'asc'
): SortStep[] => {
  // Copia local: el motor reordena sin tocar el arreglo del store.
  const items: SortItem[] = source.map((item) => ({ ...item }));

  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const orderOf = (): string[] => items.map((item) => item.id);
  const prefix = (count: number): string[] => orderOf().slice(0, count);
  const suffix = (from: number): string[] => orderOf().slice(from);

  const push = (extras: StepExtras): void => {
    steps.push({
      order: orderOf(),
      comparing: extras.comparing ?? [],
      moving: extras.moving ?? [],
      sorted: extras.sorted ?? [],
      lifted: extras.lifted ?? null,
      candidate: extras.candidate ?? null,
      note: extras.note,
      comparisons,
      swaps,
    });
  };

  push({ note: `Presioná Reproducir para ordenar de ${directionPhrase(direction)}.` });

  if (items.length > 1 && algorithm === 'bubble') {
    for (let end = items.length - 1; end > 0; end -= 1) {
      let swapped = false;

      for (let index = 0; index < end; index += 1) {
        comparisons += 1;
        const left = items[index];
        const right = items[index + 1];
        push({
          comparing: [left.id, right.id],
          sorted: suffix(end + 1),
          note: `¿${left.value} ${swapSymbol(direction)} ${right.value}?`,
        });

        if (shouldSwap(left.value, right.value, direction)) {
          items[index] = right;
          items[index + 1] = left;
          swaps += 1;
          swapped = true;
          push({
            moving: [left.id, right.id],
            sorted: suffix(end + 1),
            note: `${left.value} y ${right.value} cambian de lugar.`,
          });
        }
      }

      push({
        sorted: suffix(end),
        note: `${items[end].value} queda en su lugar.`,
      });

      if (!swapped) {
        push({
          sorted: orderOf(),
          note: 'El resto ya estaba en orden.',
        });
        break;
      }
    }
  }

  if (items.length > 1 && algorithm === 'selection') {
    for (let start = 0; start < items.length - 1; start += 1) {
      let best = start;
      push({
        candidate: items[best].id,
        sorted: prefix(start),
        note: `Buscamos el ${extremumLabel(direction)} desde la posición ${start + 1}.`,
      });

      for (let index = start + 1; index < items.length; index += 1) {
        comparisons += 1;
        push({
          comparing: [items[index].id, items[best].id],
          candidate: items[best].id,
          sorted: prefix(start),
          note: `¿${items[index].value} ${candidateSymbol(direction)} ${items[best].value}?`,
        });

        if (isBetterCandidate(items[index].value, items[best].value, direction)) {
          best = index;
          push({
            candidate: items[best].id,
            sorted: prefix(start),
            note: `Nuevo ${extremumLabel(direction)}: ${items[best].value}.`,
          });
        }
      }

      if (best !== start) {
        const displaced = items[start];
        items[start] = items[best];
        items[best] = displaced;
        swaps += 1;
        push({
          moving: [items[start].id, items[best].id],
          sorted: prefix(start),
          note: `Llevamos ${items[start].value} al frente.`,
        });
      }

      push({
        sorted: prefix(start + 1),
        note: `${items[start].value} queda en su lugar.`,
      });
    }
  }

  if (items.length > 1 && algorithm === 'insertion') {
    for (let index = 1; index < items.length; index += 1) {
      const key = items[index];
      let cursor = index;

      push({
        lifted: key.id,
        sorted: prefix(index),
        note: `Tomamos ${key.value} para insertarlo en la parte ordenada.`,
      });

      while (cursor > 0) {
        comparisons += 1;
        const neighbour = items[cursor - 1];
        push({
          lifted: key.id,
          comparing: [neighbour.id, key.id],
          sorted: prefix(index),
          note: `¿${neighbour.value} ${swapSymbol(direction)} ${key.value}?`,
        });

        if (!shouldShift(neighbour.value, key.value, direction)) break;

        items[cursor - 1] = items[cursor];
        items[cursor] = neighbour;
        swaps += 1;
        push({
          lifted: key.id,
          moving: [key.id, neighbour.id],
          sorted: prefix(index),
          note: `${key.value} se mueve una posición a la izquierda.`,
        });
        cursor -= 1;
      }

      push({
        sorted: prefix(index + 1),
        note: `${key.value} queda en su lugar.`,
      });
    }
  }

  if (items.length > 1 && algorithm === 'shell') {
    for (let gap = Math.floor(items.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
      push({
        note: gap === 1
          ? 'Última pasada: inserción con salto 1.'
          : `Shell: comparamos elementos separados por ${gap} posiciones.`,
      });

      for (let index = gap; index < items.length; index += 1) {
        const key = items[index];
        let cursor = index;

        push({
          lifted: key.id,
          sorted: gap === 1 ? prefix(index) : [],
          note: `Tomamos ${key.value} para ordenarlo con salto ${gap}.`,
        });

        while (cursor >= gap) {
          comparisons += 1;
          const neighbour = items[cursor - gap];
          push({
            lifted: key.id,
            comparing: [neighbour.id, key.id],
            sorted: gap === 1 ? prefix(index) : [],
            note: `¿${neighbour.value} ${swapSymbol(direction)} ${key.value}?`,
          });

          if (!shouldShift(neighbour.value, key.value, direction)) break;

          items[cursor - gap] = key;
          items[cursor] = neighbour;
          swaps += 1;
          push({
            lifted: key.id,
            moving: [key.id, neighbour.id],
            sorted: gap === 1 ? prefix(index) : [],
            note: `${key.value} salta ${gap} posiciones a la izquierda.`,
          });
          cursor -= gap;
        }

        push({
          sorted: gap === 1 ? prefix(index + 1) : [],
          note: `${key.value} queda en su lugar con salto ${gap}.`,
        });
      }
    }
  }

  if (items.length > 1 && algorithm === 'merge') {
    for (let width = 1; width < items.length; width *= 2) {
      for (let start = 0; start < items.length; start += width * 2) {
        const mid = Math.min(start + width, items.length);
        const end = Math.min(start + width * 2, items.length);
        if (mid >= end) continue;

        push({
          note: `Combinamos los bloques ${start + 1}-${mid} y ${mid + 1}-${end}.`,
        });

        let left = start;
        let right = mid;

        while (left < right && right < end) {
          comparisons += 1;
          const leftItem = items[left];
          const rightItem = items[right];

          push({
            comparing: [leftItem.id, rightItem.id],
            note: `¿${leftItem.value} ${direction === 'asc' ? '≤' : '≥'} ${rightItem.value}?`,
          });

          if (mergeInOrder(leftItem.value, rightItem.value, direction)) {
            left += 1;
            continue;
          }

          const displaced = items.slice(left, right);
          const moved = items[right];
          for (let cursor = right; cursor > left; cursor -= 1) {
            items[cursor] = items[cursor - 1];
          }
          items[left] = moved;
          swaps += 1;
          push({
            moving: [moved.id, ...displaced.map((item) => item.id)],
            note: `${moved.value} se adelanta y el bloque corre una posición.`,
          });
          left += 1;
          right += 1;
        }

        push({
          note: `Bloque ${start + 1}-${end} combinado.`,
        });
      }
    }
  }

  const allSorted = orderOf();
  const lastStep = steps[steps.length - 1];
  const closingNote = `Listo: ${items.length} números en orden ${direction === 'asc' ? 'ascendente' : 'descendente'}.`;

  if (lastStep && lastStep.sorted.length === allSorted.length) {
    lastStep.note = closingNote;
  } else {
    push({ sorted: allSorted, note: closingNote });
  }

  return steps;
};
