import type { AppEdge, AppNode } from './graph';

export interface ProjectSnapshot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: AppNode[];
  edges: AppEdge[];
}
