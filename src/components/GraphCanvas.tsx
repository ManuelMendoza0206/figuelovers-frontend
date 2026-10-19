import React, { useCallback, useMemo, useState } from 'react';

import ReactFlow, {
    Background,
    BackgroundVariant,
    ConnectionMode,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
} from 'reactflow';

import type {
    EdgeMouseHandler,
    NodeMouseHandler,
} from 'reactflow';

import 'reactflow/dist/style.css';

import { useGraphStore } from '../store/useGraphStore';

import type {
    AppEdge,
    AppNode,
} from '../types/graph';

import {
  BEAM_OPACITY,
  BEAM_OPACITY_DIMMED,
  BRAND_COLOR,
  createEdgeStyle,
  EDGE_STROKE_WIDTH,
} from '../lib/graphEdge';
import {
    getBidirectionalCurveInfo,
    getDynamicEdgeHandles,
    getSelfLoopHandles,
    getSelfLoopInfo,
    NO_CURVE,
    NO_SELF_LOOP,
} from '../lib/graphGeometry';
import type { GraphTool } from '../types/graph';
import { EDITOR_EVENTS, dispatchEditorEvent } from '../lib/editorEvents';
import { ConfirmDialog } from './ConfirmDialog';
import { GraphHud } from './GraphHud';
import GraphToolbar from './GraphToolbar';
import { graphEdgeTypes, graphNodeTypes } from './graphFlowTypes';
import { useDocumentShortcut } from '../hooks/useDocumentShortcut';

const CanvasContent: React.FC = () => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [activeTool, setActiveTool] = useState<GraphTool>('interact');

  /**
   * Borrado pendiente de confirmacion.
   *
   * El modo 'delete' NO borra al vuelo: el clic solo elige la victima y
   * hasta aca llega el dialogo, igual que hacia el panel lateral. La
   * diferencia es que ahora hay UN solo botón de eliminar y el que
   * decide que se borra es el clic en el lienzo.
   */
  const [pendingDelete, setPendingDelete] = useState<{
    kind: 'node' | 'edge';
    id: string;
  } | null>(null);

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    structureLocked,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    deleteEdge,
    setSelectedElement,
  } = useGraphStore();

  const nodeMap = useMemo(() => {
    const map: Map<string, AppNode> = new Map();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const displayNodes = useMemo(
    () => nodes.map((node) => ({ ...node, type: 'circularGraphNode' })),
    [nodes]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isSelfLoopEdge = edge.source === edge.target;

        const { sourceHandle, targetHandle } = isSelfLoopEdge
          ? getSelfLoopHandles()
          : getDynamicEdgeHandles(edge, nodeMap);

        const curveInfo = isSelfLoopEdge ? NO_CURVE : getBidirectionalCurveInfo(edge, edges, nodeMap);
        const selfLoopInfo = isSelfLoopEdge ? getSelfLoopInfo(edge, nodeMap) : NO_SELF_LOOP;

        /**
         * Con una seleccion activa, solo queda encendida la constelacion
         * que la toca. Sin seleccion, todas. Es lo que hace legible la
         * relacion sin cambiar la logica del grafo.
         */
        const touchesSelection = selectedNode
          ? edge.source === selectedNode.id || edge.target === selectedNode.id
          : selectedEdge?.id === edge.id;

        const isLit = !selectedNode && !selectedEdge ? true : touchesSelection;

        return {
          ...edge,
          type: 'weightedStraightEdge',
          sourceHandle,
          targetHandle,
          data: {
            ...(edge.data ?? {}),
            isCurved: curveInfo.isCurved,
            normalX: curveInfo.normalX,
            normalY: curveInfo.normalY,
            curveSign: curveInfo.curveSign,
            isSelfLoop: selfLoopInfo.isSelfLoop,
            loopCenterX: selfLoopInfo.centerX,
            loopCenterY: selfLoopInfo.centerY,
            isLit,
          },
          zIndex: edge.selected ? 40 : 20,
          style: createEdgeStyle({
            strokeWidth: edge.selected ? 2.4 : EDGE_STROKE_WIDTH,
            strokeOpacity: isLit
              ? edge.selected
                ? 1
                : BEAM_OPACITY
              : BEAM_OPACITY_DIMMED,
          }),
        };
      }),
    [edges, nodeMap, selectedNode, selectedEdge]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (activeTool === 'delete') {
        setPendingDelete({ kind: 'node', id: node.id });
        return;
      }
      if (activeTool !== 'interact') return;
      setSelectedElement(node as AppNode, null);
    },
    [activeTool, setSelectedElement]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (activeTool === 'delete') {
        setPendingDelete({ kind: 'edge', id: edge.id });
        return;
      }
      if (activeTool !== 'interact') return;
      setSelectedElement(null, edge as AppEdge);
    },
    [activeTool, setSelectedElement]
  );

  /**
   * El clic sobre el lienzo vacio es el que ejecuta en los modos que
   * trabajan por posicion: en 'add' crea la estrella donde se hizo clic
   * (antes se metia una en una coordenada aleatoria y el usuario tenia
   * que buscarla), en 'interact' deselecciona y en 'connect' no hace nada.
   *
   * Quedarse en el modo despues de crear es intencional: poder sembrar
   * varias estrellas seguidas sin volver al boton cada vez.
   */
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === 'interact') {
        setSelectedElement(null, null);
        return;
      }

      if (activeTool !== 'add') return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(position);
    },
    [activeTool, addNode, screenToFlowPosition, setSelectedElement]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool !== 'interact') return;
      // Doble clic = atajo para crear estrella. Con la forma protegida no
      // existe.
      if (structureLocked) return;

      const target = event.target as HTMLElement | null;
      if (!target?.closest('.react-flow__pane')) return;

      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(position);
    },
    [activeTool, addNode, screenToFlowPosition, structureLocked]
  );

  const handleToolChange = useCallback(
    (tool: GraphTool) => {
      // Constelación protegida: los modos que cambian la forma no se
      // activan ni por tecla. El store los rechazaría igual, pero acá el
      // usuario ni siquiera llega a intentarlo y la barra lo dice.
      if (
        structureLocked &&
        (tool === 'connect' || tool === 'add' || tool === 'delete')
      ) {
        return;
      }

      setActiveTool(tool);
      if (tool !== 'interact') setSelectedElement(null, null);
    },
    [setSelectedElement, structureLocked]
  );

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === 'node') deleteNode(pendingDelete.id);
    else deleteEdge(pendingDelete.id);

    setPendingDelete(null);
  }, [pendingDelete, deleteNode, deleteEdge]);

  /**
   * Atajos del lienzo. Van en el documento y no en el contenedor porque
   * el foco del usuario puede estar en cualquier lado; `useDocumentShortcut`
   * se encarga de ignorar los campos de texto.
   *
   * 'h' y 'o' no actuan aca: piden la accion a traves de los eventos de
   * edicion, porque la ayuda y el "limpiar todo" viven en el Navbar y ese
   * estado no le pertenece al lienzo. Asi el atajo solo existe mientras
   * la constelacion esta montada.
   */
  useDocumentShortcut('q', () => handleToolChange('interact'));
  useDocumentShortcut('w', () => handleToolChange('connect'));
  useDocumentShortcut('e', () => handleToolChange('add'));
  useDocumentShortcut('p', () => handleToolChange('delete'));
  useDocumentShortcut('h', () => dispatchEditorEvent(EDITOR_EVENTS.openHelp));
  useDocumentShortcut('o', () => dispatchEditorEvent(EDITOR_EVENTS.requestClear));
  useDocumentShortcut('escape', () => {
    // Escape con una confirmacion abierta la cierra; sin confirmacion,
    // vuelve a la herramienta neutra.
    if (pendingDelete) setPendingDelete(null);
    else handleToolChange('interact');
  });

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView]);

  /**
   * Con la forma protegida el lienzo queda "solo lectura" en lo
   * estructural: no se arrastran nodos, no se conectan y no se borra con
   * teclado. Seleccionar, hacer zoom y desplazar la vista siguen
   * habilitados, igual que editar etiquetas y pesos desde el panel.
   */
  const nodesDraggable = !structureLocked && activeTool === 'interact';
  const nodesConnectable = !structureLocked && activeTool === 'connect';
  const elementsSelectable = activeTool === 'interact';

  /**
   * En interactuar el boton izquierdo arrastra el lienzo, como siempre.
   * En los demas modos el izquierdo le pertenece a la herramienta y el
   * paneo pasa al boton central/derecho: sin esto, añadir o eliminar algo
   * fuera de la vista visible quedaria sin forma de llegar.
   */
  const panOnDrag = activeTool === 'interact' ? true : [1, 2];

  const cursorClass =
    activeTool === 'add'
      ? 'tool-cursor--add'
      : activeTool === 'delete'
        ? 'tool-cursor--delete'
        : null;

  return (
    <div
      className={['space-field relative h-full w-full overflow-hidden', cursorClass]
        .filter(Boolean)
        .join(' ')}
    >
      {/* El vacio. Tres capas, todas detras del grafo y todas
          transparentes al puntero: el lienzo se tiene que poder usar
          igual que antes. */}
      <div aria-hidden="true" className="field-nebula field-nebula-a" />
      <div aria-hidden="true" className="field-nebula field-nebula-b" />
      <div aria-hidden="true" className="field-stars" />

      <div className="absolute left-4 top-4 z-20">
        <GraphToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          locked={structureLocked}
        />
      </div>

      <GraphHud
        activeTool={activeTool}
        onFitView={handleFitView}
        locked={structureLocked}
      />

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={graphNodeTypes}
        edgeTypes={graphEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onDoubleClick={handleDoubleClick}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable={elementsSelectable}
        deleteKeyCode={structureLocked ? null : 'Backspace'}
        panOnDrag={panOnDrag}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        snapToGrid
        snapGrid={[15, 15]}
        elevateEdgesOnSelect
        defaultEdgeOptions={{
          type: 'weightedStraightEdge',
          zIndex: 20,
          style: createEdgeStyle({ zIndex: undefined }),
        }}
        connectionLineStyle={{ stroke: BRAND_COLOR, strokeWidth: 2 }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Rejilla de orientacion, casi invisible. Sin ella no hay
            ninguna referencia espacial al arrastrar el lienzo vacio; el
            campo de estrellas no sirve para eso porque no se mueve con
            el grafo. */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={96}
          lineWidth={1}
          color="#0c1330"
        />

        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!m-4 !overflow-hidden !rounded-xl !border !border-white/10 !bg-[#070d1d]/80 !shadow-2xl !backdrop-blur-md"
        />

        <MiniMap
          position="top-right"
          nodeColor={BRAND_COLOR}
          nodeBorderRadius={99}
          maskColor="rgba(3, 6, 15, 0.82)"
          nodeStrokeWidth={2}
          pannable
          zoomable
          className="!m-4 !overflow-hidden !rounded-xl !border !border-white/10 !bg-[#070d1d]/80 !shadow-2xl !backdrop-blur-md"
        />
      </ReactFlow>

      {/* La confirmacion es la misma voz que usaba el panel lateral; cambia
          solo de quien la dispara (el clic en el lienzo, no el boton del
          formulario). El modo se mantiene activo para poder encadenar
          borrados. */}
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'edge'
            ? '¿Eliminar esta conexión?'
            : '¿Eliminar esta estrella?'
        }
        message={
          pendingDelete?.kind === 'edge'
            ? 'La conexión se retirará de la constelación.'
            : 'También desaparecerán las líneas conectadas a esta estrella.'
        }
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
};