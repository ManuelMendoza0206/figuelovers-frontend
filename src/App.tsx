import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './ui/ErrorBoundary';
import { ToastContainer } from './ui';

import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';

/**
 * Todo lo que cuelga de MainLayout (navbar -> store -> reactflow) se
 * descarga solo al entrar al editor o a los algoritmos.
 *
 * LandingPage y DashboardPage viven FUERA de MainLayout, asi que un
 * visitante nuevo no paga los ~156 kB de reactflow que medimos.
 * Ese era el punto ciego del lazy por pagina: con las paginas sueltas,
 * el store quedaba igual en el chunk inicial y arrastraba la librería.
 */
const MainLayout = lazy(() =>
  import('./layout/MainLayout').then((m) => ({ default: m.MainLayout }))
);

const EditorPage = lazy(() => import('./pages/EditorPage'));
const ProjectEditorPage = lazy(() => import('./pages/ProjectEditorPage'));
const ConstellationsPage = lazy(() => import('./pages/ConstellationsPage'));

const JohnsonPage = lazy(() => import('./pages/JohnsonPage'));
const DijkstraPage = lazy(() => import('./pages/DijkstraPage'));
const KruskalPage = lazy(() => import('./pages/KruskalPage'));
const AssignmentPage = lazy(() => import('./pages/AssignmentPage'));
const NorthwestPage = lazy(() => import('./pages/NorthwestPage'));
const TreesPage = lazy(() => import('./pages/TreesPage'));

const PageFallback = () => (
  <div className="flex min-h-0 flex-1 items-center justify-center p-10 text-ink-muted">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
    <span className="ml-3 font-mono text-xs tracking-[0.16em]">calculando…</span>
  </div>
);

/**
 * Fallback de carga de chunks.
 *
 * Un `Suspense` plano se queda en el spinner para siempre si el chunk
 * falla en descargar (sin red, chunk viejo cacheado tras un deploy).
 * Este fallback distingue los dos casos y ofrece recargar.
 */
class LazyLoadBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LazyLoad]', error, info.componentStack);
  }

  handleReload = () => {
    // Recargar la pagina entera es lo que fuerza a reintentar la
    // descarga del chunk. `window.location.reload()` es justamente lo
    // que dispara React.lazy de nuevo.
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-space-shell p-10 text-ink">
        <div className="glass-panel w-full max-w-md rounded-2xl p-6 text-center">
          <p className="eyebrow text-[9px]">no se pudo cargar</p>
          <h1 className="mt-2 font-display text-lg font-extrabold">
            No pudimos traer esta pantalla
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Suele ser la conexión, o una versión vieja del sitio cacheada
            en el navegador. Recargar casi siempre lo resuelve.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-[#070d1d] transition-colors hover:bg-brand-hover"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <LazyLoadBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route element={<MainLayout />}>
                <Route path="editor" element={<EditorPage />} />
                <Route path="galaxy/:projectId" element={<ProjectEditorPage />} />
                <Route path="constellations" element={<ConstellationsPage />} />
                <Route path="johnson" element={<JohnsonPage />} />
                <Route path="dijkstra" element={<DijkstraPage />} />
                <Route path="kruskal" element={<KruskalPage />} />
                <Route path="assignment" element={<AssignmentPage />} />
                <Route path="northwest" element={<NorthwestPage />} />
                <Route path="trees" element={<TreesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </LazyLoadBoundary>
      </ErrorBoundary>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;