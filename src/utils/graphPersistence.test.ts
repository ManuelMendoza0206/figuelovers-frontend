import { afterEach, describe, expect, it } from 'vitest';
import type { AppNode } from '../types/graph';
import { buildGraphPayload, graphPayloadToFlow } from './graphFile';
import {
  createProject,
  getProject,
  saveProjectGraph,
} from './projectStorage';

describe('graph metadata persistence', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('preserves arbitrary node data through payload export and import', () => {
    const nodes: AppNode[] = [{
      id: 'node-1',
      position: { x: 10, y: 20 },
      data: {
        label: 'Origen',
        folio: 1,
        role: 'source',
        supply: 5,
        treeValue: 7,
        treeSide: 'left',
        extra: 'x',
      },
    }];

    const restored = graphPayloadToFlow(buildGraphPayload(nodes, []));

    expect(restored.nodes[0].data).toEqual(nodes[0].data);
  });

  it('preserves node data in saved projects and accepts older project data', () => {
    const project = createProject('Prueba');
    const nodes: AppNode[] = [{
      id: 'node-1',
      position: { x: 10, y: 20 },
      data: {
        label: 'Origen',
        folio: 1,
        role: 'source',
        supply: 5,
        treeValue: 7,
        treeSide: 'left',
        extra: 'x',
      },
    }];

    saveProjectGraph(project.id, nodes, []);
    expect(getProject(project.id)?.nodes[0].data).toEqual(nodes[0].data);

    window.localStorage.setItem('figuelovers.projects.v1', JSON.stringify([{
      id: 'legacy',
      name: 'Proyecto antiguo',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      nodes: [{ id: 'old-node', position: { x: 0, y: 0 }, data: { label: 'Antiguo', folio: 1 } }],
      edges: [],
    }]));

    expect(getProject('legacy')?.nodes[0].data).toEqual({ label: 'Antiguo', folio: 1 });
  });
});
