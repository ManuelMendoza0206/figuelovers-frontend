import { ArrowRight, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { ProjectNameDialog } from '../components/ProjectNameDialog';
import { UniverseNav } from '../components/UniverseNav';
import type { ProjectSnapshot } from '../types/project';
import { createProject, deleteProject, listProjects, renameProject } from '../utils/projectStorage';

const formatDate = (value: string): string => new Intl.DateTimeFormat('es', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value));

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSnapshot[]>(() => listProjects());
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

  const refresh = () => setProjects(listProjects());

  const handleCreate = (name = 'Nueva galaxia') => {
    const project = createProject(name);
    setIsNameDialogOpen(false);
    navigate(`/galaxy/${project.id}`);
  };

  const handleRename = (project: ProjectSnapshot) => {
    const nextName = window.prompt('Nombre de la galaxia', project.name);
    if (nextName === null) return;
    renameProject(project.id, nextName);
    refresh();
  };

  const handleDelete = (project: ProjectSnapshot) => {
    if (!window.confirm(`¿Eliminar ${project.name}? Esta acción no se puede deshacer.`)) return;
    deleteProject(project.id);
    refresh();
  };

  return (
    <div className="space-shell starfield min-h-screen overflow-auto text-ink">
      <UniverseNav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="mb-6"><BackButton to="/" /></div>
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-9 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-3">Nivel 02 · red cósmica</p>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Tus galaxias</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-muted">Cada proyecto es un sistema completo: constelaciones, rutas y misiones en un mismo lugar.</p>
          </div>
          <button type="button" onClick={() => setIsNameDialogOpen(true)} className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-[#07101f] transition hover:bg-brand-hover">
            <Plus className="h-4 w-4" /> Añadir galaxia
          </button>
        </div>

        {projects.length === 0 ? (
          <section className="glass-panel mt-10 flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand shadow-[0_0_42px_rgba(114,230,224,0.14)]">
              <Star className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-semibold">El mapa está esperando una primera señal</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-ink-muted">Crea una galaxia para comenzar a conectar estrellas y explorar sus rutas.</p>
            <button type="button" onClick={() => setIsNameDialogOpen(true)} className="mt-7 flex items-center gap-2 rounded-full border border-brand/40 px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/10">
              Iniciar exploración <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <article key={project.id} className="glass-panel group relative overflow-hidden rounded-[1.75rem] p-5 rise-in" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl transition group-hover:bg-brand/20" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffd684]/25 bg-[#ffd684]/10 text-[#ffd684]">
                    <Star className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">galaxy / {String(index + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="relative mt-7 truncate font-display text-xl font-semibold">{project.name}</h2>
                <p className="relative mt-2 text-xs text-ink-subtle">Actualizada el {formatDate(project.updatedAt)}</p>
                <div className="relative mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                  <div className="flex gap-4 font-mono text-xs text-ink-muted">
                    <span><strong className="text-brand">{project.nodes.length}</strong> estrellas</span>
                    <span><strong className="text-[#ffd684]">{project.edges.length}</strong> líneas</span>
                  </div>
                  <Link to={`/galaxy/${project.id}`} className="flex items-center gap-1 text-xs font-bold text-brand transition hover:text-brand-hover">Abrir <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
                <div className="relative mt-4 flex gap-2">
                  <button type="button" onClick={() => handleRename(project)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-ink-muted transition hover:border-brand/30 hover:text-ink">Renombrar</button>
                  <button type="button" onClick={() => handleDelete(project)} className="flex items-center gap-1 rounded-full border border-[#ff9f80]/20 px-3 py-1.5 text-[11px] font-semibold text-[#ffb09a] transition hover:bg-[#ff9f80]/10"><Trash2 className="h-3 w-3" /> Eliminar</button>
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="mt-10 flex justify-end">
          <button type="button" onClick={refresh} className="flex items-center gap-2 text-xs font-semibold text-ink-subtle transition hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /> Actualizar mapa</button>
        </div>
      </main>
      <ProjectNameDialog isOpen={isNameDialogOpen} onCancel={() => setIsNameDialogOpen(false)} onCreate={handleCreate} />
    </div>
  );
};

export default DashboardPage;
