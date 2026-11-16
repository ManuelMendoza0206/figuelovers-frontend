import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSortStore } from '../store/useSortStore';
import { createAlgorithmFile } from '../utils/algorithmFiles';
import { buildSortSteps, toSortItems } from '../utils/sortEngine';

/**
 * El sidebar se reemplaza por su contenido: así el test ejercita el
 * panel Sort real (que vive en `children`) sin montar el sidebar de
 * propiedades del editor.
 */
vi.mock('../components/Sidebar', () => ({
  Sidebar: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const { default: SortPage } = await import('./SortPage');

const mount = () => render(
  <MemoryRouter initialEntries={['/sort']}>
    <SortPage />
  </MemoryRouter>
);

const seed = (values: number[]): void => {
  const items = toSortItems(values, 'test');
  useSortStore.setState({
    algorithm: 'bubble',
    direction: 'asc',
    speed: 2,
    items,
    steps: buildSortSteps(items, 'bubble', 'asc'),
    cursor: 0,
    playing: false,
  });
};

const finalValues = (): number[] => {
  const { items, steps } = useSortStore.getState();
  const values = new Map(items.map((item) => [item.id, item.value]));
  const last = steps[steps.length - 1];
  return last.order.map((id) => values.get(id) ?? 0);
};

beforeEach(() => {
  seed([5, 1, 4, 2, 3]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SortPage', () => {
  it('muestra la escena y avanza paso a paso', () => {
    mount();

    expect(screen.getByRole('heading', { name: 'Ordenar en barras' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Barras del ordenamiento/ })).toBeTruthy();
    expect(screen.getByText(/Paso 001/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Paso siguiente' }));

    expect(screen.getByText(/Paso 002/)).toBeTruthy();
    expect(screen.getByRole('img', { name: /paso 2 de/ })).toBeTruthy();
  });

  it('aplica una lista separada por comas y reemplaza la anterior', () => {
    mount();

    fireEvent.change(screen.getByRole('textbox', { name: 'Números para ordenar' }), {
      target: { value: '9, 3, 7, 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar lista' }));

    expect(screen.getByText('9, 3, 7, 3')).toBeTruthy();
    expect(useSortStore.getState().items.map((item) => item.value)).toEqual([9, 3, 7, 3]);
    expect(screen.getByText(/Paso 001/)).toBeTruthy();
  });

  it('rechaza un token que no es entero sin tocar la lista', () => {
    mount();

    fireEvent.change(screen.getByRole('textbox', { name: 'Números para ordenar' }), {
      target: { value: '9, nueve' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar lista' }));

    expect(screen.getByRole('alert').textContent).toContain('no es un número entero');
    expect(useSortStore.getState().items.map((item) => item.value)).toEqual([5, 1, 4, 2, 3]);
  });

  it('genera una lista aleatoria con la cantidad pedida', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Aleatorio' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad de números' }), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar números' }));

    const items = useSortStore.getState().items;
    expect(items).toHaveLength(12);
    expect(items.every((item) => item.value >= 5 && item.value <= 99)).toBe(true);
    expect(new Set(items.map((item) => item.value)).size).toBe(12);
  });

  it('cambia de algoritmo y vuelve al primer paso', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText(/Paso 002/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Selección/ }));

    expect(useSortStore.getState().algorithm).toBe('selection');
    expect(screen.getByText(/Paso 001/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Selección/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('cambia entre menor → mayor y mayor → menor', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Menor → mayor' }));
    expect(useSortStore.getState().direction).toBe('desc');
    expect(finalValues()).toEqual([5, 4, 3, 2, 1]);

    fireEvent.click(screen.getByRole('button', { name: 'Mayor → menor' }));
    expect(useSortStore.getState().direction).toBe('asc');
    expect(finalValues()).toEqual([1, 2, 3, 4, 5]);
  });

  it('limpia la lista desde el botón Limpiar', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(useSortStore.getState().items).toEqual([]);
    expect(useSortStore.getState().steps).toEqual([]);
    expect(screen.getByText('Todavía no hay números')).toBeTruthy();
  });

  it('carga una lista guardada con dirección descendente', async () => {
    mount();
    const file = new File(
      [
        JSON.stringify(
          createAlgorithmFile('sort', {
            values: [9, 3, 7],
            algorithm: 'selection',
            direction: 'desc',
          })
        ),
      ],
      'sort.json',
      { type: 'application/json' }
    );

    fireEvent.change(screen.getByLabelText('Archivo JSON de Sort'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(useSortStore.getState().direction).toBe('desc');
      expect(useSortStore.getState().algorithm).toBe('selection');
    });
    expect(useSortStore.getState().items.map((item) => item.value)).toEqual([9, 3, 7]);
    expect(finalValues()).toEqual([9, 7, 3]);
  });

  it('permite elegir Shell y Merge', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: /Shell/ }));
    expect(useSortStore.getState().algorithm).toBe('shell');
    expect(screen.getByText(/Paso 001/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Merge/ }));
    expect(useSortStore.getState().algorithm).toBe('merge');
    expect(screen.getByText(/Paso 001/)).toBeTruthy();
  });

  it('pasa el orden visible a Árboles', () => {
    const locationRef: { current: ReturnType<typeof useLocation> | null } = { current: null };
    const Probe = () => {
      locationRef.current = useLocation();
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/sort?from=%2Feditor']}>
        <SortPage />
        <Probe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Pasar a Árboles/ }));

    expect(locationRef.current?.pathname).toBe('/trees');
    expect(new URLSearchParams(locationRef.current?.search ?? '').get('from')).toBe(
      '/sort?from=%2Feditor'
    );
    expect(
      (locationRef.current?.state as { treeValues?: number[] } | null)?.treeValues
    ).toEqual([5, 1, 4, 2, 3]);
  });

  it('ajusta la velocidad y arrastra el progreso', () => {
    mount();

    fireEvent.change(screen.getByRole('slider', { name: 'Velocidad de la animación' }), {
      target: { value: '3' },
    });
    expect(screen.getByText('3.0×')).toBeTruthy();
    expect(useSortStore.getState().speed).toBe(3);

    const last = useSortStore.getState().steps.length - 1;
    fireEvent.change(screen.getByRole('slider', { name: 'Progreso del ordenamiento' }), {
      target: { value: String(last) },
    });

    expect(useSortStore.getState().cursor).toBe(last);
    expect(screen.getByRole('status').textContent).toContain('Ordenado');
  });

  it('reproduce, avanza con el reloj y pausa', () => {
    vi.useFakeTimers();
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(useSortStore.getState().cursor).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(screen.getByRole('button', { name: /Reproducir|Repetir/ })).toBeTruthy();
  });

  it('conserva lista, algoritmo y paso al volver a entrar', () => {
    const first = mount();

    fireEvent.change(screen.getByRole('textbox', { name: 'Números para ordenar' }), {
      target: { value: '9, 3, 7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Inserción/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Paso siguiente' }));

    first.unmount();
    mount();

    expect(screen.getByText('9, 3, 7')).toBeTruthy();
    expect(screen.getByText(/Paso 002/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Inserción/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('muestra el estado vacío y genera una lista desde ahí', () => {
    useSortStore.setState({ items: [], steps: [], cursor: 0, playing: false });
    mount();

    expect(screen.getByText('Todavía no hay números')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Generar 16 al azar' }));

    expect(useSortStore.getState().items).toHaveLength(16);
    expect(screen.getByRole('img', { name: /Barras del ordenamiento/ })).toBeTruthy();
  });
});
