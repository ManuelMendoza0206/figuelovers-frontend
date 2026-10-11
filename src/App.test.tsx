import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';

/**
 * Smoke del arbol de rutas.
 *
 * Se vea como obvio, pero MainLayout paso a ser lazy y con eso se movio
 * el limite de Suspense. Un error de provider o de import rompia TODA la
 * app en runtime y ninguna prueba lo cubria.
 */

vi.mock('./components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const irA = (ruta: string) => {
  window.history.pushState({}, '', ruta);
  return render(<App />);
};

describe('App - arbol de rutas', () => {
  it('monta la landing en /', () => {
    irA('/');
    // La landing usa UniverseNav, no el Navbar del editor.
    expect(screen.getByText(/universo observable/i)).toBeTruthy();
  });

  it('monta la landing sin el Navbar del editor (o sea sin reactflow)', () => {
    irA('/');
    // MainLayout es lazy: la landing no debe montar el Navbar ni,
    // por lo tanto, arrastrar reactflow en la carga inicial.
    expect(screen.queryByTestId('navbar')).toBeNull();
  });

  it('redirige las rutas desconocidas a la landing', () => {
    irA('/ruta-que-no-existe');
    expect(window.location.pathname).toBe('/');
  });

  it('no lanza al entrar a una ruta lazy', async () => {
    // El error aparecia como un throw no capturado que se comia la app
    // entera en vez de caerse en el ErrorBoundary.
    const errores: unknown[] = [];
    const original = window.addEventListener;
    void original;

    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation((...args: unknown[]) => {
      errores.push(args[0]);
    });

    irA('/editor');

    // Damos margen a que resuelvan los imports dinamicos.
    await new Promise((resolve) => setTimeout(resolve, 50));

    spy.mockRestore();

    const mensaje = errores.map(String).join(' ');
    expect(mensaje).not.toContain('is not a function');
    expect(mensaje).not.toContain('Cannot read');
  });
});