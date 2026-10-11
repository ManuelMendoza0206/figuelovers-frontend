/**
 * Setup de los tests.
 *
 * jsdom no implementa ResizeObserver, que React Flow usa para medir el
 * contenedor del grafo. Sin esto, montar GraphCanvas tira
 * "ResizeObserver is not defined".
 */

class ResizeObserverStub {
  observe(): void {
    /* no-op en tests */
  }

  unobserve(): void {
    /* no-op en tests */
  }

  disconnect(): void {
    /* no-op en tests */
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1;
    constructor() {
      /* stub */
    }
  } as unknown as typeof DOMMatrixReadOnly;
}