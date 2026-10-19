import { ArrowRight, Lock, RefreshCw, Unlock } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GraphCanvas } from '../components/GraphCanvas';
import { JohnsonFloatingPanel } from '../components/JohnsonFloatingPanel';
import { Sidebar } from '../components/Sidebar';
import { useClearSelectionOnUnmount } from '../hooks/useClearSelectionOnUnmount';
import { error as toastError, success as toastSuccess } from '../hooks/useToast';
import { useGraphStore } from '../store/useGraphStore';
import { isConstellationProject } from '../types/project';
import { extractApiErrorMessage } from '../utils/apiError';
import { loadConstellationGraph } from '../utils/constellationCatalog';
import { graphPayloadToFlow } from '../utils/graphFile';
import { getProject, saveProjectGraph } from '../utils/projectStorage';
import { Button } from '../ui';

/**
 * Editor de un proyecto (galaxia) y su grafo.
 *
 * Si el proyecto viene del catalogo de constelaciones, el STORE queda
 * bloqueado: la forma no se puede tocar (agregar, borrar, mover, limpiar,
 * importar) pero si se pueden renombrar estrellas y editar pesos y
 * direcciones. Aca aparece el banner que lo explica y el boton de
 * "Restaurar original", que vuelve a la plantilla.
 */
const ProjectEditorPage: React.FC = () => {
  useClearSelectionOnUnmount();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    nodes,
    edges,
    constellationId,
    loadGraph,
    loadConstellation,
    setAllEdgesDirected,
    structureLocked,
  } = useGraphStore();

  const loadedProjectId = useRef<string | null>(null);

  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /** true: hacerlas todas dirigidas. false: todas sin dirección. */
  const [directionChoice, setDirectionChoice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const project = getProject(projectId);
    if (!project) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (isConstellationProject(project)) {
      // Con bloqueo: nada de agregar, borrar o mover.
      loadConstellation(
        project.constellationId ?? project.id,
        project.nodes,
        project.edges
      );
    } else {
      // Proyecto libre: carga y DESACTIVA cualquier bloqueo heredado de
      // una constelacion que el usuario hubiera visitado antes.
      loadGraph(project.nodes, project.edges);
    }

    loadedProjectId.current = projectId;
  }, [loadConstellation, loadGraph, navigate, projectId]);

  useEffect(() => {
    if (!projectId || loadedProjectId.current !== projectId || !getProject(projectId)) return;
    saveProjectGraph(projectId, nodes, edges);
  }, [edges, nodes, projectId]);

  /**
   * Restaurar la plantilla.
   *
   * Es el UNICO flujo que puede reescribir la forma con el bloqueo
   * activo, porque justamente vuelve a la forma original. Por eso no
   * pasa por `replaceGraph` (que rechaza en modo bloqueado) sino por
   * `loadConstellation`, que recarga y mantiene la proteccion.
   */
  const restoreOriginal = useCallback(async () => {
    if (!projectId || !constellationId) return;

    setIsRestoring(true);
    try {
      const file = await loadConstellationGraph(constellationId);
      const { nodes: templateNodes, edges: templateEdges } = graphPayloadToFlow(file.graph);

      saveProjectGraph(projectId, templateNodes, templateEdges);
      loadConstellation(constellationId, templateNodes, templateEdges);
      toastSuccess('Constelación restaurada: pesos, nombres y forma originales.');
    } catch (err: unknown) {
      toastError(extractApiErrorMessage(err, 'No se pudo restaurar la constelación.'));
    } finally {
      setIsRestoring(false);
      setIsRestoreDialogOpen(false);
    }
  }, [constellationId, loadConstellation, projectId]);

  const confirmDirection = useCallback(() => {
    if (directionChoice === null) return;
    setAllEdgesDirected(directionChoice);
    setDirectionChoice(null);
  }, [directionChoice, setAllEdgesDirected]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-void-deep">
      <main
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-void"
        aria-label="Constelaciones, editor de grafos"
      >
        {/* Cabecera en flujo y no superpuesta: el lienzo empieza abajo y
            la barra de herramientas no tapa ni el titulo ni el banner. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
          <div>
            <p className="eyebrow text-[10px]">Nivel 04 · constelaciones</p>
            <p className="mt-1 font-display text-lg font-semibold text-ink">
              Mapa de conexiones
            </p>
          </div>

          {structureLocked && (
            <div
              role="status"
              className="flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-mission/30 bg-mission/10 px-4 py-2.5"
            >
              <span className="flex items-center gap-2 text-xs text-ink">
                <Lock className="h-4 w-4 shrink-0 text-mission" aria-hidden="true" />
                <span>
                  <strong className="font-bold">Constelación protegida</strong>
                  : la forma es fija. Puedes renombrar estrellas y editar
                  pesos y direcciones de las conexiones.
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDirectionChoice(true)}
                  title="Todas las conexiones quedan con flecha. No cambia la forma: solo cambia si son dirigidas."
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Todas dirigidas
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDirectionChoice(false)}
                  title="Todas las conexiones quedan sin flecha."
                >
                  <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                  Todas no dirigidas
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  loading={isRestoring}
                  onClick={() => setIsRestoreDialogOpen(true)}
                  title="Vuelve a la plantilla original: forma, pesos y nombres de estrellas."
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Restaurar original
                </Button>
              </span>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1">
          <GraphCanvas />
          <JohnsonFloatingPanel />
        </div>

        <div className="absolute bottom-5 right-24 z-20">
          <BackButton to="/dashboard" />
        </div>
      </main>

      <aside className="h-full shrink-0" aria-label="Panel de propiedades">
        <Sidebar />
      </aside>

      <ConfirmDialog
        isOpen={isRestoreDialogOpen}
        title="¿Restaurar la constelación original?"
        message="Se restablecen la forma, los nombres de las estrellas y los pesos de la plantilla. Los cambios que hiciste sobre este proyecto se pierden."
        confirmLabel="Restaurar"
        onCancel={() => setIsRestoreDialogOpen(false)}
        onConfirm={restoreOriginal}
      />

      <ConfirmDialog
        isOpen={directionChoice !== null}
        title={directionChoice ? '¿Hacer todas las conexiones dirigidas?' : '¿Quitar la dirección de todas las conexiones?'}
        message={
          directionChoice
            ? 'Cada conexión quedará marcada con flecha. No se agregan ni se quitan líneas: solo cambia la dirección.'
            : 'Cada conexión quedará sin flecha. No se agregan ni se quitan líneas: solo cambia la dirección.'
        }
        confirmLabel="Aplicar"
        onCancel={() => setDirectionChoice(null)}
        onConfirm={confirmDirection}
      />
    </div>
  );
};

export default ProjectEditorPage;
