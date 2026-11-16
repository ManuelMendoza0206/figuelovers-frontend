import { describe, expect, it } from 'vitest';

import {
  balancedPreorder,
  inorderFromPrePost,
  parseTraversalInput,
  sameSequence,
} from './treeTraversal';

describe('treeTraversal', () => {
  it('parsea valores separados por comas o espacios', () => {
    expect(parseTraversalInput('4, 2, 5')).toEqual({ ok: true, values: [4, 2, 5] });
    expect(parseTraversalInput('4 2 5')).toEqual({ ok: true, values: [4, 2, 5] });
  });

  it('rechaza tokens inválidos, repetidos y vacíos', () => {
    expect(parseTraversalInput('')).toMatchObject({ ok: false });
    expect(parseTraversalInput('2, 2')).toMatchObject({ ok: false });
    expect(parseTraversalInput('2.5')).toMatchObject({ ok: false });
    expect(parseTraversalInput('dos')).toMatchObject({ ok: false });
  });

  it('compara secuencias sin ordenar los arreglos originales', () => {
    const first = [2, 1, 3];

    expect(sameSequence(first, [2, 1, 3])).toBe(true);
    expect(sameSequence(first, [3, 2, 1])).toBe(false);
    expect(first).toEqual([2, 1, 3]);
  });

  it('genera el pre-order de un ABB balanceado', () => {
    expect(balancedPreorder([1, 2, 3])).toEqual([2, 1, 3]);
    expect(balancedPreorder([1, 2, 3, 4])).toEqual([3, 2, 1, 4]);
  });

  it('deriva el In-order de Pre-order y Post-order de un árbol completo', () => {
    expect(inorderFromPrePost([2, 1, 3], [1, 3, 2])).toEqual({
      ok: true,
      inorder: [1, 2, 3],
      ambiguous: false,
      preferredBst: true,
    });
    expect(inorderFromPrePost([1, 2, 4, 5, 3], [4, 5, 2, 3, 1])).toEqual({
      ok: true,
      inorder: [4, 2, 5, 1, 3],
      ambiguous: false,
      preferredBst: false,
    });
  });

  it('prefiere la interpretación ABB cuando el par ambiguo es compatible', () => {
    expect(inorderFromPrePost([1, 2, 3], [3, 2, 1])).toEqual({
      ok: true,
      inorder: [1, 2, 3],
      ambiguous: true,
      preferredBst: true,
    });
  });

  it('elige el hijo izquierdo cuando el par ambiguo no es un ABB', () => {
    expect(inorderFromPrePost([2, 1, 3], [3, 1, 2])).toEqual({
      ok: true,
      inorder: [3, 1, 2],
      ambiguous: true,
      preferredBst: false,
    });
  });

  it('rechaza Pre-order y Post-order incompatibles', () => {
    expect(inorderFromPrePost([2, 1, 3], [1, 2, 3])).toMatchObject({ ok: false });
    expect(inorderFromPrePost([2, 1, 3], [1, 3])).toMatchObject({ ok: false });
    expect(inorderFromPrePost([2, 1, 3], [1, 3, 4])).toMatchObject({ ok: false });
  });
});
