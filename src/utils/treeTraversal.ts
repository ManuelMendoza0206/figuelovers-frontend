/**
 * Helpers para editar los recorridos de /trees.
 *
 * El backend reconstruye desde in-order + pre/post-order cuando el conjunto
 * de valores no cambia. Cuando el usuario cambia los valores, la página arma
 * un ABB nuevo con `buildTree`: pre-order se inserta tal cual, post-order se
 * invierte e in-order se convierte en un pre-order balanceado.
 */

export const MAX_TREE_NODES = 31;

export type TraversalParseResult =
  | { ok: true; values: number[] }
  | { ok: false; reason: string };

export const parseTraversalInput = (input: string): TraversalParseResult => {
  const tokens = input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { ok: false, reason: 'Ingresá al menos un número entero.' };
  }

  const values: number[] = [];
  for (const token of tokens) {
    if (!/^-?\d+$/.test(token)) {
      return { ok: false, reason: `"${token}" no es un número entero.` };
    }

    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      return { ok: false, reason: `El número ${token} está fuera del rango permitido.` };
    }
    if (values.includes(value)) {
      return { ok: false, reason: `El valor ${value} está repetido en el recorrido.` };
    }

    values.push(value);
  }

  if (values.length > MAX_TREE_NODES) {
    return {
      ok: false,
      reason: `El árbol no puede superar ${MAX_TREE_NODES} nodos.`,
    };
  }

  return { ok: true, values };
};

export const sameSequence = (first: number[], second: number[]): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

/**
 * Pre-order de un ABB balanceado construido desde valores ya ordenados.
 * Insertar esa secuencia con `buildTree` produce el árbol balanceado.
 */
export const balancedPreorder = (sorted: number[]): number[] => {
  if (sorted.length === 0) return [];

  const middle = Math.floor(sorted.length / 2);
  return [
    sorted[middle],
    ...balancedPreorder(sorted.slice(0, middle)),
    ...balancedPreorder(sorted.slice(middle + 1)),
  ];
};

export type PrePostInorderResult =
  | {
      ok: true;
      inorder: number[];
      ambiguous: boolean;
      preferredBst: boolean;
    }
  | { ok: false; reason: string };

type TreePreview = {
  postorder: number[];
  ambiguous: boolean;
};

/**
 * Reconstruye el árbol que definen Pre-order + In-order y devuelve su
 * Post-order. Sirve para comprobar si un par Pre/Post es compatible con
 * el In-order ordenado de un ABB.
 */
const buildWithInorder = (preorder: number[], inorder: number[]): TreePreview | null => {
  const inorderIndex = new Map(inorder.map((value, index) => [value, index]));

  const build = (
    preStart: number,
    preEnd: number,
    inStart: number,
    inEnd: number
  ): TreePreview | null => {
    if (preStart > preEnd) return { postorder: [], ambiguous: false };

    const root = preorder[preStart];
    const rootIn = inorderIndex.get(root);
    if (rootIn === undefined || rootIn < inStart || rootIn > inEnd) return null;

    const leftSize = rootIn - inStart;
    const left = build(preStart + 1, preStart + leftSize, inStart, rootIn - 1);
    if (!left) return null;

    const right = build(preStart + leftSize + 1, preEnd, rootIn + 1, inEnd);
    if (!right) return null;

    return {
      postorder: [...left.postorder, ...right.postorder, root],
      ambiguous:
        left.ambiguous ||
        right.ambiguous ||
        (left.postorder.length === 0) !== (right.postorder.length === 0),
    };
  };

  return build(0, preorder.length - 1, 0, inorder.length - 1);
};

/**
 * Deriva un In-order compatible con un Pre-order y un Post-order.
 *
 * Pre-order + Post-order no determinan un árbol único cuando un nodo
 * tiene un solo hijo. Si el par es compatible con un ABB, preferimos esa
 * interpretación y usamos el In-order ordenado. Si no, elegimos el hijo
 * izquierdo, que es la convención habitual, y marcamos `ambiguous` para
 * que la página pueda avisarlo.
 */
export const inorderFromPrePost = (
  preorder: number[],
  postorder: number[]
): PrePostInorderResult => {
  if (preorder.length !== postorder.length) {
    return {
      ok: false,
      reason: 'Los recorridos deben tener la misma cantidad de valores.',
    };
  }

  if (preorder.length === 0) {
    return { ok: true, inorder: [], ambiguous: false, preferredBst: false };
  }

  if (
    new Set(preorder).size !== preorder.length ||
    new Set(postorder).size !== postorder.length
  ) {
    return { ok: false, reason: 'Los recorridos no pueden tener valores repetidos.' };
  }

  const preorderValues = new Set(preorder);
  if (
    postorder.some((value) => !preorderValues.has(value)) ||
    postorder.length !== preorder.length
  ) {
    return {
      ok: false,
      reason: 'Los recorridos contienen valores distintos.',
    };
  }

  const sortedInorder = [...preorder].sort((first, second) => first - second);
  const bstPreview = buildWithInorder(preorder, sortedInorder);
  if (bstPreview && sameSequence(bstPreview.postorder, postorder)) {
    return {
      ok: true,
      inorder: sortedInorder,
      ambiguous: bstPreview.ambiguous,
      preferredBst: true,
    };
  }

  const postIndex = new Map(postorder.map((value, index) => [value, index]));
  const inorder: number[] = [];
  let ambiguous = false;
  let failed = false;

  const walk = (
    preStart: number,
    preEnd: number,
    postStart: number,
    postEnd: number
  ): void => {
    if (failed) return;
    if (preStart > preEnd || postStart > postEnd) {
      if (preStart <= preEnd || postStart <= postEnd) failed = true;
      return;
    }

    const root = preorder[preStart];
    if (postorder[postEnd] !== root) {
      failed = true;
      return;
    }

    if (preStart === preEnd) {
      if (postStart !== postEnd) {
        failed = true;
        return;
      }
      inorder.push(root);
      return;
    }

    const leftRoot = preorder[preStart + 1];
    const leftRootPost = postIndex.get(leftRoot);
    if (
      leftRootPost === undefined ||
      leftRootPost < postStart ||
      leftRootPost >= postEnd
    ) {
      failed = true;
      return;
    }

    // Un solo hijo: Pre-order y Post-order no permiten saber si es
    // izquierdo o derecho. Elegimos izquierdo para obtener un árbol.
    if (leftRootPost === postEnd - 1) {
      ambiguous = true;
      walk(preStart + 1, preEnd, postStart, postEnd - 1);
      if (failed) return;
      inorder.push(root);
      return;
    }

    const leftSize = leftRootPost - postStart + 1;
    const leftPreEnd = preStart + leftSize;
    if (leftPreEnd >= preEnd) {
      failed = true;
      return;
    }

    walk(preStart + 1, leftPreEnd, postStart, leftRootPost);
    if (failed) return;

    inorder.push(root);

    walk(leftPreEnd + 1, preEnd, leftRootPost + 1, postEnd - 1);
  };

  walk(0, preorder.length - 1, 0, postorder.length - 1);

  if (failed || inorder.length !== preorder.length) {
    return {
      ok: false,
      reason: 'Los recorridos no son compatibles entre sí.',
    };
  }

  return { ok: true, inorder, ambiguous, preferredBst: false };
};
