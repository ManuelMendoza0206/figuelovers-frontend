import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectEditorPage from './ProjectEditorPage';
import { useGraphStore } from '../store/useGraphStore';
import {
  constellationAssetUrl,
  resetConstellationCatalogCache,
} from '../utils/constellationCatalog';
import { createConstellationProject, createProject, getProject } from '../utils/projectStorage';
import type { AppEdge, AppNode } from '../types/graph';

/**
 * Editor con una constelación abierta.
 *
 * El banner y los botones deshabilitados son la parte VISIBLE del
 * bloqueo; la parte real vive en el store (probada por separado en
 * useGraphStore.lock.test.ts). Acá se comprueba que las dos se
 * conectan: que la página carga el grafo con bloqueo, que la UI lo
 * refleja y que "Restaurar original" es el único flujo que puede
 * reescribir la forma.
 */

const STORE = () => useGraphStore.getState();

const projectNodes = [
  { id: 'betelgeuse', position: { x: 0, y: 0 }, data: { label: 'Nombre editado' } },
  { id: 'rigel', position: { x: 100, y: 0 }, data: { label: 'Rigel' } },
] as AppNode[];

const projectEdges = [
  {
    id: 'orion-betelgeuse-rigel',
    source: 'betelgeuse',
    target: 'rigel',
    label: '9',
    data: { weight: 9, is_directed: false },
  },
] as AppEdge[];

/** La plantilla original, con el nombre y el peso que tenía al salir de public/. */
const TEMPLATE = {
  metadata: { version: '1.0.0', name: 'Orión', created_at: '2026-01-01T00:00:00Z' },
  graph: {
    nodes: [
      { id: 'betelgeuse', label: 'Betelgeuse', position: { x: 0, y: 0 } },
      { id: 'rigel', label: 'Rigel', position: { x: 100, y: 0 } },
    ],
    edges: [
      {
        id: 'orion-betelgeuse-rigel',
        source: 'betelgeuse',
        target: 'rigel',
        weight: 1,
        is_directed: false,
      },
    ],
  },
};

const stubFetch = (template: unknown = TEMPLATE) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      const body =
        url === constellationAssetUrl('constellations/index.json')
          ? [
              {
                id: 'orion',
                name: 'Orión',
                file: 'orion.json',
                description: 'El cazador celeste.',
                stars: 2,
              },
            ]
          : url === constellationAssetUrl('constellations/orion.json')
            ? template
            : undefined;

      if (typeof body === 'undefined') {
        return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
      }

      const text = JSON.stringify(body);
      return {
        ok: true,
        status: 200,
        text: async () => text,
        json: async () => JSON.parse(text),
      };
    })
  );
};

const renderEditor = (projectId: string) =>
  render(
    <MemoryRouter initialEntries={[`/galaxy/${projectId}`]}>
      <Routes>
        <Route path="/galaxy/:projectId" element={<ProjectEditorPage />} />
      </Routes>
    </MemoryRouter>
  );

let constellationProjectId = '';

beforeEach(() => {
  window.localStorage.clear();
  resetConstellationCatalogCache();
  STORE().setStructureLocked(false);
  STORE().clearGraph();

  constellationProjectId = createConstellationProject(
    'orion',
    'Orión',
    projectNodes,
    projectEdges
  ).id;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetConstellationCatalogCache();
  STORE().setStructureLocked(false);
  STORE().clearGraph();
});

describe('ProjectEditorPage - constelación protegida', () => {
  it('carga el proyecto bloqueado y muestra el banner con lo que se puede editar', async () => {
    stubFetch();

    renderEditor(constellationProjectId);

    const texto = (await screen.findByRole('status')).textContent ?? '';
    expect(texto).toMatch(/Constelación protegida/);
    expect(texto).toMatch(/la forma es fija\. Puedes renombrar estrellas y editar/);
    expect(texto).toMatch(/pesos y direcciones de las conexiones/);

    await waitFor(() => expect(STORE().structureLocked).toBe(true));
    expect(STORE().constellationId).toBe('orion');
    expect(STORE().nodes).toHaveLength(2);
  });

  it('deja los botones de forma deshabilitados pero a la vista', async () => {
    stubFetch();

    renderEditor(constellationProjectId);
    await screen.findByRole('status');

    const botonAdd = screen.getByRole('button', { name: /Modo añadir/ });
    const botonDelete = screen.getByRole('button', { name: /Modo eliminar/ });
    const botonConnect = screen.getByRole('button', { name: /Modo conectar/ });

    expect(botonAdd.hasAttribute('disabled')).toBe(true);
    expect(botonDelete.hasAttribute('disabled')).toBe(true);
    expect(botonConnect.hasAttribute('disabled')).toBe(true);

    // No se ocultan: el motivo vive en el tooltip.
    expect(botonAdd.getAttribute('title')).toMatch(/forma es fija/);

    // El modo sigue en Interactuar y el HUD lo dice con el texto de
    // protección, no con el de "mueve nodos".
    expect(screen.getByText(/renombra estrellas y edita pesos/)).toBeTruthy();
    expect(screen.queryByText(/mueve, selecciona y edita/)).toBeNull();
  });

  it('los atajos de forma no activan sus modos', async () => {
    stubFetch();

    renderEditor(constellationProjectId);
    await screen.findByRole('status');

    fireEvent.keyDown(document.body, { key: 'e' });
    fireEvent.keyDown(document.body, { key: 'p' });

    expect(screen.queryByText(/clic en el lienzo para crear una estrella/)).toBeNull();
    expect(screen.queryByText(/clic en una estrella o conexión/)).toBeNull();
    expect(STORE().structureLocked).toBe(true);
  });

  it('sigue permitiendo renombrar y editar pesos y direcciones', async () => {
    stubFetch();

    renderEditor(constellationProjectId);
    await screen.findByRole('status');

    STORE().updateNodeData('betelgeuse', 'Betelgeuse roja');
    STORE().updateEdgeData('orion-betelgeuse-rigel', 3, true);

    expect(STORE().nodes.find((node) => node.id === 'betelgeuse')?.data.label).toBe(
      'Betelgeuse roja'
    );
    expect(
      STORE().edges.find((edge) => edge.id === 'orion-betelgeuse-rigel')?.data?.weight
    ).toBe(3);

    // Lo que NO está permitido, el store lo rechaza sin romper nada.
    expect(STORE().addNode({ x: 500, y: 500 })).toBe(false);
    expect(STORE().nodes).toHaveLength(2);
  });

  it('restaurar original devuelve la plantilla y conserva el proyecto', async () => {
    stubFetch();

    renderEditor(constellationProjectId);
    await screen.findByRole('status');

    fireEvent.click(screen.getByRole('button', { name: /Restaurar original/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => {
      expect(
        STORE().nodes.find((node) => node.id === 'betelgeuse')?.data.label
      ).toBe('Betelgeuse');
    });

    expect(
      STORE().edges.find((edge) => edge.id === 'orion-betelgeuse-rigel')?.data?.weight
    ).toBe(1);

    // El proyecto sigue existiendo y guardó la plantilla.
    const saved = getProject(constellationProjectId);
    expect(saved?.nodes).toHaveLength(2);
    expect(saved?.kind).toBe('constellation');

    // Y el bloqueo sigue activo: restaurar no es una forma de salir.
    expect(STORE().structureLocked).toBe(true);
  });

  it('permite marcar todas las aristas como dirigidas con confirmación', async () => {
    stubFetch();

    renderEditor(constellationProjectId);
    await screen.findByRole('status');

    fireEvent.click(screen.getByRole('button', { name: /Todas dirigidas/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar' }));

    await waitFor(() => {
      expect(
        STORE().edges.every((edge) => edge.data?.is_directed === true)
      ).toBe(true);
    });

    // Nada estructural cambió.
    expect(STORE().nodes).toHaveLength(2);
    expect(STORE().edges).toHaveLength(1);
  });
});

describe('ProjectEditorPage - regresión con proyecto libre', () => {
  it('un proyecto sin kind no muestra banner ni bloquea nada', async () => {
    stubFetch();

    const free = createProject('Galaxia libre');
    renderEditor(free.id);

    await waitFor(() => expect(STORE().nodes).toHaveLength(0));

    expect(screen.queryByText(/Constelación protegida/)).toBeNull();
    expect(STORE().structureLocked).toBe(false);
    expect(
      screen.getByRole('button', { name: /Modo añadir/ }).hasAttribute('disabled')
    ).toBe(false);
    expect(STORE().addNode({ x: 10, y: 10 })).toBe(true);
  });
});
