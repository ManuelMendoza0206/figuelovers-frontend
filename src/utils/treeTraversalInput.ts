export type ParsedTraversal =
  | { ok: true; values: number[] }
  | { ok: false; message: string };

export const parseTraversalInput = (input: string): ParsedTraversal => {
  const tokens = input.trim().split(/[,\s]+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, message: 'La cadena de recorrido no puede estar vacía.' };
  const values: number[] = [];
  for (const token of tokens) {
    if (!/^-?\d+$/.test(token)) {
      return { ok: false, message: `“${token}” no es un número entero válido.` };
    }
    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      return { ok: false, message: `“${token}” está fuera del rango de enteros admitido.` };
    }
    values.push(value);
  }
  return { ok: true, values };
};
