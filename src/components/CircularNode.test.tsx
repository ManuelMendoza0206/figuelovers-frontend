import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReactFlowProvider } from 'reactflow';

import type { NodeProps } from 'reactflow';

import type { AppNodeData } from '../types/graph';

import {
  CircularNode,
  CONNECTION_POINTS,
  getConnectionStyle,
  starTwinklePhase,
} from './CircularNode';

/** `Handle` lee el store de React Flow: sin provider, error 001. */
const renderNode = (props: NodeProps<AppNodeData>) =>
  render(
    <ReactFlowProvider>
      <CircularNode {...props} />
    </ReactFlowProvider>
  );

const node = (
  overrides: Partial<NodeProps<AppNodeData>> = {}
): NodeProps<AppNodeData> =>
  ({
    id: 'node-1',
    data: { label: 'A', folio: 1 },
    selected: false,
    type: 'circularGraphNode',
    ...overrides,
  }) as NodeProps<AppNodeData>;

/**
 * La estrella se dibuja con halo, nucleo, anillo y etiqueta. De esos
 * cuatro, la caja de 76px es la UNICA que React Flow usa como caja del
 * nodo: los handles y el origen de las aristas se calculan en %
 * sobre ella.
 *
 * Por eso la etiqueta va en posicion absoluta FUERA de la caja. Estos
 * tests son la red que avisa si eso se rompe alguna vez.
 */
describe('CircularNode - caja de interaccion', () => {
  it('manda los handles a porcentajes dentro de la caja', () => {
    for (let index = 0; index < CONNECTION_POINTS; index += 1) {
      const style = getConnectionStyle(index);

      const left = Number.parseFloat(style.left);
      const top = Number.parseFloat(style.top);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    }
  });

  it('pone el punto 0 arriba y el punto opuesto abajo del circulo', () => {
    const top = getConnectionStyle(0);
    const bottom = getConnectionStyle(CONNECTION_POINTS / 2);

    expect(top.top).toBe('0%');
    expect(top.left).toBe('50%');
    expect(bottom.top).toBe('100%');
    expect(bottom.left).toBe('50%');
  });

  it('expone los 24 pares de handles que usan las aristas', () => {
    renderNode(node());

    expect(screen.getAllByTitle('A')).toHaveLength(1);
    expect(document.querySelectorAll('.react-flow__handle')).toHaveLength(
      CONNECTION_POINTS * 2
    );
  });
});

describe('CircularNode - estrella', () => {
  it('anuncia el nodo con su nombre accesible', () => {
    renderNode(node({ data: { label: 'Ciudad Norte', folio: 7 } }));

    expect(screen.getByLabelText('Nodo Ciudad Norte')).toBeTruthy();
    expect(screen.getByText('Ciudad Norte')).toBeTruthy();
  });

  it('centellea en una fase estable y dentro de un solo ciclo', () => {
    const first = starTwinklePhase('node-42');

    expect(starTwinklePhase('node-42')).toBe(first);
    expect(starTwinklePhase('node-43')).not.toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(6000);
  });

  it('solo dibuja el anillo de enfoque cuando esta seleccionado', () => {
    const { container, rerender } = renderNode(node());

    expect(container.querySelector('.star-ring')).toBeNull();

    rerender(
      <ReactFlowProvider>
        <CircularNode {...node({ selected: true })} />
      </ReactFlowProvider>
    );

    expect(container.querySelector('.star-ring')).not.toBeNull();
  });

  it('dibuja el anillo dorado del camino sin necesidad de seleccion', () => {
    const { container } = renderNode(
      node({ data: { label: 'A', folio: 1, isPathNode: true } })
    );

    expect(container.querySelector('.star-path')).not.toBeNull();
    expect(container.querySelector('.star-ring')).toBeNull();
  });
});