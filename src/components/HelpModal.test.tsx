import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EDITOR_EVENTS } from '../lib/editorEvents';
import { HelpModal } from './HelpModal';

describe('HelpModal algorithm details', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders six algorithm cards and expands their accessible details', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    expect(screen.getByText('Rutas interestelares (Johnson)')).toBeTruthy();
    expect(screen.getByText('Camino mínimo (Dijkstra)')).toBeTruthy();
    expect(screen.getByText('Árbol de expansión (Kruskal)')).toBeTruthy();
    expect(screen.getByText('Comando de misión (Asignación húngara)')).toBeTruthy();
    expect(screen.getByText('Esquina Noroeste (transporte)')).toBeTruthy();
    expect(screen.getByText('Árboles binarios de búsqueda')).toBeTruthy();

    const treeCard = screen.getByRole('button', { name: /Árboles binarios de búsqueda/ });
    expect(treeCard.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(treeCard);
    expect(treeCard.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Pre-order visita raíz/)).toBeTruthy();
  });

  it('expands the Dijkstra card with what the algorithm really does', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    const card = screen.getByRole('button', { name: /Camino mínimo \(Dijkstra\)/ });
    expect(card.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(card);
    expect(card.getAttribute('aria-expanded')).toBe('true');

    expect(screen.getByText(/pesos negativos/)).toBeTruthy();
    expect(screen.getByText(/Johnson exige|no hace falta que todas sean dirigidas/)).toBeTruthy();
    expect(screen.getByText(/100 nodos/)).toBeTruthy();
  });

  it('expands the Kruskal card with the rule, the forest case and the tie-break', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    const card = screen.getByRole('button', { name: /Árbol de expansión \(Kruskal\)/ });
    expect(card.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(card);
    expect(card.getAttribute('aria-expanded')).toBe('true');

    expect(screen.getByText(/une dos grupos de nodos distintos/)).toBeTruthy();
    expect(screen.getByText(/bosque de expansión/)).toBeTruthy();
    expect(screen.getByText(/orden original de las aristas/)).toBeTruthy();
    expect(screen.getByText(/100 nodos y 500 aristas/)).toBeTruthy();
  });
});

describe('HelpModal - atajos del lienzo', () => {
  afterEach(() => {
    cleanup();
  });

  it('se abre y se cierra cuando el lienzo pide ayuda (atajo H)', () => {
    render(<HelpModal />);

    expect(screen.queryByText('Rutas interestelares (Johnson)')).toBeNull();

    const pedirAyuda = () =>
      act(() => {
        window.dispatchEvent(new CustomEvent(EDITOR_EVENTS.openHelp));
      });

    pedirAyuda();
    expect(screen.getByText('Rutas interestelares (Johnson)')).toBeTruthy();

    pedirAyuda();
    expect(screen.queryByText('Rutas interestelares (Johnson)')).toBeNull();
  });

  it('lista la tecla de cada herramienta', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    expect(screen.getByText('Abrir esta ayuda')).toBeTruthy();
    expect(screen.getByText('Limpiar todo')).toBeTruthy();
    expect(screen.getByText('Volver a Interactuar')).toBeTruthy();
  });
});

describe('HelpModal - constelaciones', () => {
  afterEach(() => {
    cleanup();
  });

  it('explica qué son, qué se puede editar y cómo se usan los algoritmos', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    const card = screen.getByRole('button', { name: /Constelaciones famosas/ });
    expect(card.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(card);
    expect(card.getAttribute('aria-expanded')).toBe('true');

    // Resumen visible siempre (sin desplegar también se lee).
    expect(screen.getByText(/Plantillas de figuras reales del cielo/)).toBeTruthy();

    // Explicación desplegable.
    expect(screen.getByText(/La forma es fija/)).toBeTruthy();
    expect(screen.getByText(/Johnson exige aristas dirigidas/)).toBeTruthy();
    expect(screen.getByText('Restaurar original')).toBeTruthy();
    expect(screen.getByText(/JSON normal/)).toBeTruthy();
  });
});
