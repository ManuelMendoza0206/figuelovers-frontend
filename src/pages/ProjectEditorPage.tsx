import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { GraphCanvas } from '../components/GraphCanvas';
import { JohnsonFloatingPanel } from '../components/JohnsonFloatingPanel';
import { Sidebar } from '../components/Sidebar';
import { useClearSelectionOnUnmount } from '../hooks/useClearSelectionOnUnmount';
import { useGraphStore } from '../store/useGraphStore';
import { getProject, saveProjectGraph } from '../utils/projectStorage';

const ProjectEditorPage: React.FC = () => {
  useClearSelectionOnUnmount();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { nodes, edges, loadGraph } = useGraphStore();
  const loadedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const project = getProject(projectId);
    if (!project) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadGraph(project.nodes, project.edges);
    loadedProjectId.current = projectId;
  }, [loadGraph, navigate, projectId]);

  useEffect(() => {
    if (!projectId || loadedProjectId.current !== projectId || !getProject(projectId)) return;
    saveProjectGraph(projectId, nodes, edges);
  }, [edges, nodes, projectId]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-void-deep">
      <main className="relative min-w-0 flex-1 overflow-hidden bg-void" aria-label="Constelaciones, editor de grafos">
        <div className="absolute bottom-5 right-24 z-20"><BackButton to="/dashboard" /></div>
        <div className="pointer-events-none absolute left-5 top-5 z-10">
          <p className="eyebrow text-[10px]">Nivel 04 · constelaciones</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink">Mapa de conexiones</p>
        </div>
        <GraphCanvas />
        <JohnsonFloatingPanel />
      </main>
      <aside className="h-full shrink-0" aria-label="Panel de propiedades">
        <Sidebar />
      </aside>
    </div>
  );
};

export default ProjectEditorPage;
