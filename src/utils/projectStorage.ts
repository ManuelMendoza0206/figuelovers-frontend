import type { AppEdge, AppNode } from '../types/graph';
import type { ProjectSnapshot } from '../types/project';

const STORAGE_KEY = 'figuelovers.projects.v1';

const readProjects = (): ProjectSnapshot[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ProjectSnapshot[] : [];
  } catch {
    return [];
  }
};

const writeProjects = (projects: ProjectSnapshot[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

const makeId = (): string => `galaxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const listProjects = (): ProjectSnapshot[] =>
  readProjects().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

export const getProject = (projectId: string): ProjectSnapshot | null =>
  readProjects().find((project) => project.id === projectId) ?? null;

export const createProject = (name = 'Nueva galaxia'): ProjectSnapshot => {
  const now = new Date().toISOString();
  const project: ProjectSnapshot = {
    id: makeId(),
    name,
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: [],
  };
  writeProjects([...readProjects(), project]);
  return project;
};

export const updateProject = (
  projectId: string,
  changes: Partial<Pick<ProjectSnapshot, 'name' | 'nodes' | 'edges'>>
): ProjectSnapshot | null => {
  const projects = readProjects();
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;

  const updatedProject: ProjectSnapshot = {
    ...project,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  writeProjects(projects.map((item) => item.id === projectId ? updatedProject : item));
  return updatedProject;
};

export const renameProject = (projectId: string, name: string): ProjectSnapshot | null =>
  updateProject(projectId, { name: name.trim() || 'Sin nombre' });

export const deleteProject = (projectId: string): void => {
  writeProjects(readProjects().filter((project) => project.id !== projectId));
};

export const saveProjectGraph = (
  projectId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): ProjectSnapshot | null => updateProject(projectId, { nodes, edges });
