import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConstellationsPage from './ConstellationsPage';
import { constellationAssetUrl, resetConstellationCatalogCache } from '../utils/constellationCatalog';
import { listProjects } from '../utils/projectStorage';

/**
 * Galería de constelaciones.
 *
 * Lo que se protege acá es el contrato de la sección: carga las
 * plantillas, aísla un archivo roto en SU tarjeta, y "abrir" crea un
 * proyecto propio en el storage y navega al editor.
 */

const INDEX = [
  {
    id: 'orion',
    name: 'Orión',
    file: 'orion.json',
    description: 'El cazador celeste.',
    stars: 2,
  },
  {
    id: 'rota',
    name: 'Rota',
    file: 'rota.json',
    description: 'Esta plantilla está rota a propósito.',
    stars: 1,
  },
];

const ORION_FILE = {
  metadata: { version: '1.0.0', name: 'Orión', created_at: '2026-01-01T00:00:00Z' },
  graph: {
    nodes: [
      { id: 'betelgeuse', label: 'Betelgeuse', position: { x: 0, y: 0 } },
      { id: 'rigel', label: 'Rigel', position: { x: 100, y: 100 } },
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

const stubFetch = (routes: Record<string, unknown>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const body = routes[String(input)];

      if (typeof body === 'undefined') {
        return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
      }

      const text = typeof body === 'string' ? body : JSON.stringify(body);
      return {
        ok: true,
        status: 200,
        text: async () => text,
        json: async () => JSON.parse(text),
      };
    })
  );
};

const routesCon = (extra: Record<string, unknown> = {}) => ({
  [constellationAssetUrl('constellations/index.json')]: INDEX,
  [constellationAssetUrl('constellations/orion.json')]: ORION_FILE,
  ...extra,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/constellations']}>
      <Routes>
        <Route path="/constellations" element={<ConstellationsPage />} />
        <Route path="/galaxy/:projectId" element={<p>editor abierto</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  window.localStorage.clear();
  resetConstellationCatalogCache();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetConstellationCatalogCache();
});

describe('ConstellationsPage', () => {
  it('muestra las tarjetas del índice con su vista previa y su cantidad de estrellas', async () => {
    stubFetch(routesCon({
      [constellationAssetUrl('constellations/rota.json')]: 'esto no es un json',
    }));

    const { container } = renderPage();

    // Estado de carga visible mientras llega el índice.
    expect(screen.getByText(/cargando catálogo/)).toBeTruthy();

    expect(await screen.findByText('Orión')).toBeTruthy();
    expect(screen.getByText('El cazador celeste.')).toBeTruthy();
    expect(screen.getByText(/2 estrellas/)).toBeTruthy();

    // La vista previa se dibuja desde las posiciones del propio JSON:
    // dos circulos por estrella (el halo y el núcleo) y una linea por
    // conexión.
    const preview = container.querySelector('svg[role="img"]');
    expect(preview).not.toBeNull();
    expect(preview?.querySelectorAll('circle')).toHaveLength(2 * ORION_FILE.graph.nodes.length);
    expect(preview?.querySelectorAll('line')).toHaveLength(
      ORION_FILE.graph.edges.length
    );
  });

  it('aisla el error de una tarjeta: la otra se sigue pudiendo abrir', async () => {
    stubFetch(routesCon({
      [constellationAssetUrl('constellations/rota.json')]: 'esto no es un json',
    }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringMatching(/rota\.json/)
    );

    // La rota no tiene boton de abrir...
    expect(screen.getByText('Rota')).toBeTruthy();
    // ...pero la sana sí.
    fireEvent.click(screen.getByRole('button', { name: 'Abrir constelación' }));

    expect(await screen.findByText('editor abierto')).toBeTruthy();
  });

  it('abrir crea un proyecto propio de constelación y navega al editor', async () => {
    stubFetch(routesCon());

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir constelación' }));

    await screen.findByText('editor abierto');

    const projects = listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.kind).toBe('constellation');
    expect(projects[0]?.constellationId).toBe('orion');
    expect(projects[0]?.nodes).toHaveLength(2);
  });

  it('si ya hay una copia, ofrece continuarla o crear una nueva', async () => {
    stubFetch(routesCon());

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir constelación' }));
    await screen.findByText('editor abierto');

    cleanup();
    renderPage();

    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear copia nueva' })).toBeTruthy();

    // "Continuar" no duplica.
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('editor abierto');
    expect(listProjects()).toHaveLength(1);
  });

  it('muestra el error del índice con opción de reintentar', async () => {
    stubFetch({});

    renderPage();

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toMatch(/No se pudo cargar el índice de constelaciones/);
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy();
  });

  it('muestra el estado vacío cuando el índice no tiene entradas', async () => {
    stubFetch({ [constellationAssetUrl('constellations/index.json')]: [] });

    renderPage();

    expect(
      await screen.findByText(/Todavía no hay constelaciones publicadas/)
    ).toBeTruthy();
  });

  it('el índice real del repo tiene una tarjeta por constelación publicada', async () => {
    // El archivo de verdad, sin mocks de contenido: si alguien agrega una
    // constelación a public/ pero olvida el índice (o al revés), esto se
    // entera.
    const publicDir = resolve(process.cwd(), 'public/constellations');
    const index = JSON.parse(readFileSync(resolve(publicDir, 'index.json'), 'utf8')) as {
      id: string;
      file: string;
      stars: number;
    }[];

    const routes: Record<string, string> = {
      [constellationAssetUrl('constellations/index.json')]: readFileSync(
        resolve(publicDir, 'index.json'),
        'utf8'
      ),
    };

    index.forEach((entry) => {
      routes[constellationAssetUrl(`constellations/${entry.file}`)] = readFileSync(
        resolve(publicDir, entry.file),
        'utf8'
      );
    });

    stubFetch(routes);
    resetConstellationCatalogCache();

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Abrir constelación' })).toHaveLength(
        index.length
      );
    });
  });
});
