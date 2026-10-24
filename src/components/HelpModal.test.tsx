import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { EDITOR_EVENTS } from '../lib/editorEvents';
import { HelpModal } from './HelpModal';

const HelpHarness: React.FC<{ initialPath: string }> = ({ initialPath }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <HelpModal
        isOpen={isOpen}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      />
    </MemoryRouter>
  );
};

const renderHelp = (initialPath: string) => render(<HelpHarness initialPath={initialPath} />);

const openHelp = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir ayuda' }));
};

afterEach(cleanup);

describe('HelpModal contextual', () => {
  it('abre la guía de la sección actual con pasos y botones concretos', () => {
    renderHelp('/trees');
    openHelp();

    expect(screen.getByRole('dialog', { name: 'Construir y recorrer' })).toBeTruthy();
    expect(screen.getByText('Paso a paso')).toBeTruthy();
    expect(screen.getByText('Botones y controles')).toBeTruthy();
    expect(screen.getByText('Recorrer')).toBeTruthy();
    expect(screen.getByText('Enviar al editor')).toBeTruthy();
  });

  it('cambia el contenido al cambiar de sección', () => {
    const { unmount } = renderHelp('/johnson');
    openHelp();

    expect(screen.getByRole('dialog', { name: /JOHNSON/ })).toBeTruthy();
    expect(screen.getByText('Calcular')).toBeTruthy();
    expect(screen.getByText('Origen / Destino')).toBeTruthy();

    unmount();

    renderHelp('/sort');
    openHelp();

    expect(screen.getByRole('dialog', { name: /SORT/ })).toBeTruthy();
    expect(screen.getByText('Aplicar lista / Vaciar')).toBeTruthy();
    expect(screen.getByText('Reproducir / Pausar / Repetir')).toBeTruthy();
  });

  it('incluye los atajos del lienzo solo en el editor', () => {
    renderHelp('/editor');
    openHelp();

    expect(screen.getByText('Atajos del lienzo')).toBeTruthy();
    expect(screen.getByText('Añadir nodo (E)')).toBeTruthy();
    expect(screen.getByText('Limpiar todo')).toBeTruthy();
  });

  it('cierra desde el botón del panel', () => {
    renderHelp('/northwest');
    openHelp();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel de ayuda' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se abre y se cierra con el atajo H del editor', () => {
    renderHelp('/editor');

    const pedirAyuda = () =>
      act(() => {
        window.dispatchEvent(new CustomEvent(EDITOR_EVENTS.openHelp));
      });

    pedirAyuda();
    expect(screen.getByRole('dialog', { name: 'Construí y conectá tu grafo' })).toBeTruthy();

    pedirAyuda();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
