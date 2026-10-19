import type { AppEdge, AppNode } from './graph';

/**
 * Tipo de proyecto.
 *
 * - 'free': el grafo normal, editable a gusto. Es el valor por DEFECTO y
 *   no se escribe en el storage: los proyectos antiguos no lo traen y
 *   `kind` ausente se interpreta como libre. Esa es la clave para no
 *   romper nada que ya exista en el localStorage del usuario.
 * - 'constellation': una constelación famosa copiada desde
 *   public/constellations. Su FORMA (nodos y aristas) es fija; solo se
 *   pueden renombrar estrellas y editar pesos/direcciones.
 */
export type ProjectKind = 'free' | 'constellation';

export interface ProjectSnapshot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: AppNode[];
  edges: AppEdge[];

  /** Ausente = 'free' (proyectos creados antes de las constelaciones). */
  kind?: ProjectKind;

  /** Solo cuando kind === 'constellation': id del archivo del catálogo. */
  constellationId?: string;
}

/** Lee el tipo sin exigirlo: un snapshot viejo es 'free' por definición. */
export const projectKindOf = (project: Pick<ProjectSnapshot, 'kind'>): ProjectKind =>
  project.kind ?? 'free';

/** true solo para proyectos que vienen de una plantilla del catálogo. */
export const isConstellationProject = (project: Pick<ProjectSnapshot, 'kind'>): boolean =>
  projectKindOf(project) === 'constellation';
