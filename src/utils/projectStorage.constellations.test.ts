import { beforeEach, describe, expect, it } from 'vitest';

import type { AppEdge, AppNode } from '../types/graph';
import { isConstellationProject, projectKindOf } from '../types/project';
import {
  createConstellationProject,
  createProject,
  deleteProject,
  findConstellationProject,
  getProject,
  listProjects,
  renameProject,
  saveProjectGraph,
} from './projectStorage';

/**
 * Proyectos de constelación en el storage local.
 *
 * La restricción que sostiene todo esto es RETROCOMPATIBILIDAD: los
 * proyectos que el usuario ya tiene guardados no traen `kind`, y eso
 * tiene que seguir significando "grafo libre". Ninguna clave de
 * localStorage cambió.
 */

const STORAGE_KEY = 'figuelovers.projects.v1';

const nodes = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } },
  { id: 'b', position: { x: 100, y: 0 }, data: { label: 'B' } },
] as AppNode[];

const edges = [
  { id: 'a-b', source: 'a', target: 'b', data: { weight: 1, is_directed: false } },
] as AppEdge[];

beforeEach(() => {
  window.localStorage.clear();
});

describe('createConstellationProject', () => {
  it('guarda kind y constellationId y sobreviven el recargado', () => {
    const project = createConstellationProject('orion', 'Orión', nodes, edges);

    expect(project.kind).toBe('constellation');
    expect(project.constellationId).toBe('orion');

    // Recargado = volver a leer el storage, como hace el editor.
    const reloaded = getProject(project.id);
    expect(reloaded?.kind).toBe('constellation');
    expect(reloaded?.constellationId).toBe('orion');
    expect(reloaded?.nodes).toHaveLength(2);
    expect(reloaded?.edges).toHaveLength(1);
  });

  it('renombrar y guardar el grafo NO pierde la marca de constelación', () => {
    const project = createConstellationProject('osa-mayor', 'Osa Mayor', nodes, edges);

    renameProject(project.id, 'Mi copia del carro');
    saveProjectGraph(project.id, nodes.slice(0, 1), []);

    const reloaded = getProject(project.id);
    expect(reloaded?.name).toBe('Mi copia del carro');
    expect(reloaded?.nodes).toHaveLength(1);
    expect(reloaded?.kind).toBe('constellation');
    expect(reloaded?.constellationId).toBe('osa-mayor');
  });

  it('no duplica en silencio: findConstellationProject devuelve la copia existente', () => {
    const first = createConstellationProject('casiopea', 'Casiopea', nodes, edges);
    const second = createConstellationProject('orion', 'Orión', nodes, edges);

    expect(findConstellationProject('casiopea')?.id).toBe(first.id);
    expect(findConstellationProject('orion')?.id).toBe(second.id);
    expect(findConstellationProject('no-existe')).toBeNull();
    expect(listProjects()).toHaveLength(2);
  });

  it('eliminar el proyecto no deja rastro: la plantilla vive en public/, no acá', () => {
    const project = createConstellationProject('orion', 'Orión', nodes, edges);

    deleteProject(project.id);

    expect(listProjects()).toHaveLength(0);
    expect(findConstellationProject('orion')).toBeNull();
  });
});

describe('compatibilidad con proyectos antiguos', () => {
  it('un proyecto guardado sin kind se lee como libre', () => {
    // Clave real, formato anterior: ni kind ni constellationId.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'galaxy-vieja',
          name: 'Proyecto de antes',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          nodes,
          edges,
        },
      ])
    );

    const project = getProject('galaxy-vieja');

    expect(project).not.toBeNull();
    expect(projectKindOf(project!)).toBe('free');
    expect(isConstellationProject(project!)).toBe(false);
    expect(findConstellationProject('galaxy-vieja')).toBeNull();
  });

  it('createProject sigue escribiendo proyectos sin marca, es decir libres', () => {
    const project = createProject('Galaxia nueva');

    expect(project.kind).toBeUndefined();
    expect(isConstellationProject(project)).toBe(false);

    // Round-trip completo por el storage.
    expect(isConstellationProject(getProject(project.id)!)).toBe(false);
  });
});
