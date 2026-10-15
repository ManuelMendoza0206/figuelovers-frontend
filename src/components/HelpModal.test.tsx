import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HelpModal } from './HelpModal';

describe('HelpModal algorithm details', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders four algorithm cards and expands their accessible details', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));

    expect(screen.getByText('Rutas interestelares (Johnson)')).toBeTruthy();
    expect(screen.getByText('Comando de misión (Asignación húngara)')).toBeTruthy();
    expect(screen.getByText('Esquina Noroeste (transporte)')).toBeTruthy();
    expect(screen.getByText('Árboles binarios de búsqueda')).toBeTruthy();

    const treeCard = screen.getByRole('button', { name: /Árboles binarios de búsqueda/ });
    expect(treeCard.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(treeCard);
    expect(treeCard.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Pre-order visita raíz/)).toBeTruthy();
  });
});
