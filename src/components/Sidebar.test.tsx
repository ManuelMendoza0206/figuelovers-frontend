import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GitBranch } from 'lucide-react';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useGraphStore } from '../store/useGraphStore';
import { Sidebar } from './Sidebar';

/**
 * El sidebar tiene dos modos: propiedades de la selección (editor) y
 * workbench (secciones que traen su propio panel, como árboles).
 *
 * El contrato es "uno o el otro": en modo workbench nunca se cuelan los
 * formularios de la selección, ni siquiera con un nodo seleccionado que
 * sobrevivió a la navegación.
 */

const mount = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const CurrentPath: React.FC = () => {
  const location = useLocation();
  return <span>{location.pathname}{location.search}</span>;
};

beforeEach(() => {
  useGraphStore.getState().clearGraph();
});

afterEach(() => {
  cleanup();
  useGraphStore.getState().clearGraph();
});

describe('Sidebar', () => {
  it('sin workbench muestra el estado vacío de propiedades', () => {
    mount(<Sidebar />);

    expect(screen.getByText('Propiedades')).toBeTruthy();
    expect(screen.getByText('Selecciona un elemento')).toBeTruthy();
  });

  it('en modo workbench muestra su contenido y no las propiedades', () => {
    mount(
      <Sidebar
        workbench={{
          icon: GitBranch,
          title: 'Árbol binario',
          subtitle: 'Menores a la izquierda, mayores a la derecha',
        }}
      >
        <div>Panel de trabajo</div>
      </Sidebar>
    );

    expect(screen.getByText('Panel de trabajo')).toBeTruthy();
    expect(screen.getByText('Árbol binario')).toBeTruthy();
    expect(screen.queryByText('Selecciona un elemento')).toBeNull();
    expect(screen.queryByText('Propiedades')).toBeNull();
  });

  it.each([
    ['DIJKSTRA', '/dijkstra'],
    ['KRUSKAL', '/kruskal'],
  ])('navega a %s desde las herramientas del sidebar', (label, path) => {
    mount(
      <>
        <Sidebar />
        <CurrentPath />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar herramientas de algoritmos' }));
    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(screen.getByText(`${path}?from=%2Feditor`)).toBeTruthy();
  });
});
