import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AlgorithmHelp } from './AlgorithmHelp';

afterEach(cleanup);

describe('AlgorithmHelp', () => {
  it('arranca cerrado y muestra el texto al abrir', () => {
    render(
      <AlgorithmHelp
        title="Cómo funciona la prueba"
        summary="Resumen de la prueba."
        items={['Primer punto.', 'Segundo punto.']}
      />
    );

    expect(screen.queryByText('Resumen de la prueba.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ayuda/ }));

    expect(screen.getByText('Resumen de la prueba.')).toBeTruthy();
    expect(screen.getByText('Primer punto.')).toBeTruthy();
    expect(screen.getByText('Segundo punto.')).toBeTruthy();
  });

  it('se vuelve a cerrar al pulsar el botón', () => {
    render(
      <AlgorithmHelp
        title="Cómo funciona la prueba"
        summary="Resumen de la prueba."
        items={[]}
      />
    );

    const trigger = screen.getByRole('button', { name: /Ayuda/ });

    fireEvent.click(trigger);
    expect(screen.getByText('Resumen de la prueba.')).toBeTruthy();

    fireEvent.click(trigger);
    expect(screen.queryByText('Resumen de la prueba.')).toBeNull();
  });
});
