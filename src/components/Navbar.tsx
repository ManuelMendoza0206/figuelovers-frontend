import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Database, List } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { GraphServiceAPI } from '../services/api';
import { error, success } from '../hooks/useToast';
import { IconButton } from '../ui';

import {
  buildGraphPayload,
  downloadGraphAsJson,
  parseGraphFile,
  graphPayloadToFlow,
  GraphFileParseError,
} from '../utils/graphFile';

import { HelpModal } from './HelpModal';
import { MatrixModal } from './MatrixModal';
import { AdjListModal } from './AdjListModal';

const extractErrorMessage = (
  err: unknown,
  fallback: string
): string => {
  if (err instanceof GraphFileParseError) {
    return err.message;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err
  ) {
    const response = (
      err as {
        response?: {
          data?: {
            detail?: unknown;
          };
        };
      }
    ).response;

    const detail = response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (detail) {
      return JSON.stringify(detail);
    }
  }

  return fallback;
};

const Spinner = () => (
  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-brand" />
);

export const Navbar: React.FC = () => {
  const {
    nodes,
    edges,
    validationData,
    setValidationData,
    loadGraph,
    clearGraph,
  } = useGraphStore();

  const [isFetchingMatrix, setIsFetchingMatrix] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isAdjListModalOpen, setIsAdjListModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const folioByNodeId: Record<string, number> = nodes.reduce(
    (map, node) => {
      map[node.id] = node.data.folio;
      return map;
    },
    {} as Record<string, number>
  );

  const openValidationView = async (
    view: 'matrix' | 'list'
  ) => {
    if (nodes.length === 0) {
      error('Añade al menos un nodo al lienzo antes de ver la vista.');
      return;
    }

    const setFetching =
      view === 'matrix' ? setIsFetchingMatrix : setIsFetchingList;

    const openModal =
      view === 'matrix'
        ? () => setIsMatrixModalOpen(true)
        : () => setIsAdjListModalOpen(true);

    setFetching(true);

    try {
      const response = await GraphServiceAPI.validateGraph(
        buildGraphPayload(nodes, edges)
      );

      if (!response.data) {
        error('El servidor no devolvió datos del grafo.');
        return;
      }

      setValidationData(response.data);
      openModal();
    } catch (err: unknown) {
      error(extractErrorMessage(err, 'Error al conectar con FastAPI.'));
    } finally {
      setFetching(false);
    }
  };

  const handleShowMatrix = () => openValidationView('matrix');

  const handleShowList = () => openValidationView('list');

  const handleExportJson = () => {
    if (nodes.length === 0) {
      error('El lienzo está vacío, no hay nada que guardar.');
      return;
    }

    try {
      const payload = buildGraphPayload(nodes, edges);
      downloadGraphAsJson(payload);
      success('Grafo guardado en JSON correctamente.');
    } catch {
      error('No se pudo generar el archivo JSON.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsImporting(true);

    try {
      const graphFile = await parseGraphFile(file);
      const response = await GraphServiceAPI.importGraph(graphFile);

      if (!response.data) {
        error('El servidor no devolvió un grafo válido.');
        return;
      }

      const { nodes: flowNodes, edges: flowEdges } = graphPayloadToFlow(response.data.graph);
      loadGraph(flowNodes, flowEdges);
      success('Grafo importado correctamente.');
    } catch (err: unknown) {
      error(extractErrorMessage(err, 'No se pudo importar el archivo.'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearGraph = () => {
    if (nodes.length === 0 && edges.length === 0) {
      error('El lienzo ya está vacío.');
      return;
    }

    const confirmed = window.confirm(
      '¿Estás seguro de que quieres eliminar todo el grafo? Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    clearGraph();
    setIsMatrixModalOpen(false);
    setIsAdjListModalOpen(false);
    success('Grafo limpiado correctamente.');
  };

  return (
    <>
      <header className="relative z-30 w-full border-b border-border bg-slate-50/80 backdrop-blur-sm shadow-sm">
        <div className="flex min-h-16 w-full items-center px-4 py-2 sm:px-6 lg:px-8">
          
          {/* 1. Logo y Título */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-md">
              <img src="/logo.jpg" alt="Aristografos" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Aristografos</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grafos y algoritmos</span>
              </div>
            </div>
          </div>

          {/* 2. Separador y Botón Limpiar (Izquierda) */}
          <div className="mx-6 hidden h-8 w-px bg-slate-200 sm:block" />
          
          <IconButton
            onClick={handleClearGraph}
            title="Eliminar todo el grafo"
            aria-label="Eliminar todo el grafo"
            className="hidden sm:flex items-center gap-2 rounded-md bg-red-100/60 px-3 py-1.5 text-red-700 transition-colors hover:bg-red-200/60 border border-red-200"
          >
            <Trash2 className="h-4 w-4" />
            <span className="font-semibold">Limpiar Todo</span>
          </IconButton>

          {/* Espaciador flexible para empujar el resto a la derecha */}
          <div className="flex-1" />

          {/* 3. Acciones del lado derecho */}
          <div className="flex shrink-0 items-center gap-4">
            
            {/* Vistas (Teal) */}
            <div className="flex items-center gap-2">
              <HelpModal />

              <IconButton
                onClick={handleShowMatrix}
                disabled={isFetchingMatrix}
                title="Ver matriz de adyacencia"
                aria-label="Ver matriz de adyacencia"
                className="flex items-center gap-2 rounded-md bg-teal-100/50 px-3 py-1.5 text-teal-700 transition-colors hover:bg-teal-200/50 border border-teal-200"
              >
                {isFetchingMatrix ? <Spinner /> : <Database className="h-4 w-4" />}
                <span className="hidden md:inline font-semibold">Ver Matriz</span>
              </IconButton>

              <IconButton
                onClick={handleShowList}
                disabled={isFetchingList}
                title="Ver lista de adyacencia"
                aria-label="Ver lista de adyacencia"
                className="flex items-center gap-2 rounded-md bg-teal-100/50 px-3 py-1.5 text-teal-700 transition-colors hover:bg-teal-200/50 border border-teal-200"
              >
                {isFetchingList ? <Spinner /> : <List className="h-4 w-4" />}
                <span className="hidden md:inline font-semibold">Ver Lista</span>
              </IconButton>
            </div>

            {/* Separador */}
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            {/* Archivos (Gris/Teal claro) */}
            <div className="flex items-center gap-2">
              <IconButton 
                onClick={handleExportJson} 
                title="Guardar grafo en JSON"
                aria-label="Guardar grafo en JSON"
                className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-200 border border-slate-200"
              >
                <Download className="h-4 w-4 text-teal-700" />
                <span className="hidden sm:inline font-semibold">Guardar JSON</span>
              </IconButton>

              <IconButton 
                onClick={handleImportClick} 
                disabled={isImporting} 
                title="Cargar grafo desde JSON"
                aria-label="Cargar grafo desde JSON"
                className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-200 border border-slate-200"
              >
                {isImporting ? <Spinner /> : <Upload className="h-4 w-4 text-teal-700" />}
                <span className="hidden sm:inline font-semibold">Cargar JSON</span>
              </IconButton>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFileChange}
              />
            </div>

          </div>
        </div>
      </header>

      <MatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        data={validationData?.matriz_adyacencia ?? null}
        folioByNodeId={folioByNodeId}
      />

      <AdjListModal
        isOpen={isAdjListModalOpen}
        onClose={() => setIsAdjListModalOpen(false)}
        data={validationData?.lista_adyacencia ?? null}
        folioByNodeId={folioByNodeId}
      />
    </>
  );
};