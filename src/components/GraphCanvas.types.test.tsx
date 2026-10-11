import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';

import { GraphCanvas } from './GraphCanvas';

/**
 * Regresion para el error 002 de React Flow:
 *
 *   "It looks like you've created a new nodeTypes or edgeTypes object"
 *
 * React Flow lo dispara cuando la REFERENCIA de nodeTypes/edgeTypes
 * cambia entre renders manteniendo las mismas claves. Su codigo
 * (@reactflow/core useNodeOrEdgeTypes) compara con
 * `shallow(typesKeysRef.current, typeKeys)`.
 *
 * GraphCanvas es la unica pieza que registra nodeTypes/edgeTypes, asi
 * que este test monta el componente real. Se envuelve en StrictMode
 * porque asi corre en main.tsx.
 */

const MENSAJE_002 = 'new nodeTypes or edgeTypes';

const capturarWarnings = (montar: () => void): string[] => {
  const errores: string[] = [];
  const original = console.warn;

  console.warn = (...args: unknown[]) => {
    errores.push(args.map(String).join(' '));
  };

  try {
    montar();
  } finally {
    console.warn = original;
  }

  return errores;
};

const errores002 = (mensajes: string[]): string[] =>
  mensajes.filter((mensaje) => mensaje.includes(MENSAJE_002));

describe('GraphCanvas - nodeTypes/edgeTypes estables (error 002)', () => {
  it('no dispara el error 002 al montar', () => {
    const mensajes = capturarWarnings(() => {
      const { unmount } = render(
        <StrictMode>
          <GraphCanvas />
        </StrictMode>
      );
      unmount();
    });

    expect(
      errores002(mensajes),
      `React Flow se quejo de nodeTypes/edgeTypes: ${errores002(mensajes).join(' | ')}`
    ).toHaveLength(0);
  });

  it('no dispara el error 002 tras re-renderizar', () => {
    const arbol = (
      <StrictMode>
        <GraphCanvas />
      </StrictMode>
    );

    const mensajes = capturarWarnings(() => {
      const { rerender, unmount } = render(arbol);
      rerender(arbol);
      rerender(arbol);
      unmount();
    });

    expect(errores002(mensajes)).toHaveLength(0);
  });
});