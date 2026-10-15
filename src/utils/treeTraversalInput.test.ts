import { describe, expect, it } from 'vitest';
import { parseTraversalInput } from './treeTraversalInput';

describe('parseTraversalInput', () => {
  it('accepts comma and whitespace separators', () => {
    expect(parseTraversalInput('4, 2  7')).toEqual({ ok: true, values: [4, 2, 7] });
  });

  it('rejects empty and non-integer input', () => {
    expect(parseTraversalInput(' , ')).toEqual({
      ok: false,
      message: 'La cadena de recorrido no puede estar vacía.',
    });
    expect(parseTraversalInput('2, x')).toEqual({
      ok: false,
      message: '“x” no es un número entero válido.',
    });
    expect(parseTraversalInput('1.5')).toMatchObject({ ok: false });
  });
});
