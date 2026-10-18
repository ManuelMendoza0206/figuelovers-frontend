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
  PATH_COLOR,
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
import {
  buildJohnsonGraphSignature,
  getJohnsonPath,
  getJohnsonPathEdgeIds,
  useJohnsonResult,
} from '../store/useJohnsonResult';
import { GraphHud } from './GraphHud';
import GraphToolbar from './GraphToolbar';
import { graphEdgeTypes, graphNodeTypes } from './graphFlowTypes';

const CanvasContent: React.FC = () => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [activeTool, setActiveTool] = useState<GraphTool>('interact');

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedElement,
  } = useGraphStore();

  const johnsonResult = useJohnsonResult((state) => state.result);
  const johnsonSignature = useJohnsonResult((state) => state.graphSignature);
  const johnsonSource = useJohnsonResult((state) => state.source);
  const johnsonTarget = useJohnsonResult((state) => state.target);

  /**
   * Camino resaltado de Johnson, derivado y no guardado en el grafo.
   *
   * Solo existe mientras la firma coincide con el grafo actual: si
   * agregas, borras o cambias un peso, el resultado deja de ser valido
   * y el resaltado se apaga solo. Asi no secuestra la seleccion que usa
   * el panel de propiedades.
   */
  const pathHighlight = useMemo(() => {
    if (!johnsonResult || !johnsonSignature) return null;
    if (johnsonSignature !== buildJohnsonGraphSignature(nodes, edges)) {
      return null;
    }
    if (johnsonResult.has_negative_cycle) return null;

    const path = getJohnsonPath(johnsonResult, johnsonSource, johnsonTarget);
    if (path.length < 2) return null;

    return {
      nodeIds: new Set(path),
      edgeIds: new Set(getJohnsonPathEdgeIds(edges, path)),
    };
  }, [johnsonResult, johnsonSignature, johnsonSource, johnsonTarget, nodes, edges]);

  const nodeMap = useMemo(() => {
    const map: Map<string, AppNode> = new Map();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const isPathNode = pathHighlight?.nodeIds.has(node.id) ?? false;
        if (!isPathNode) {
          return { ...node, type: 'circularGraphNode' };
        }

        return {
          ...node,
          type: 'circularGraphNode',
          data: { ...node.data, isPathNode: true },
        };
      }),
    [nodes, pathHighlight]
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

        const baseLit = !selectedNode && !selectedEdge ? true : touchesSelection;
        const isPath = pathHighlight?.edgeIds.has(edge.id) ?? false;
        // El camino es un resultado y manda sobre la seleccion: si hay
        // resaltado activo, solo el camino queda encendido.
        const isLit = pathHighlight ? isPath : baseLit;

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
            isPath,
          },
          zIndex: isPath ? 45 : edge.selected ? 40 : 20,
          style: createEdgeStyle({
            ...(isPath ? { stroke: PATH_COLOR } : {}),
            strokeWidth: isPath ? 3.2 : edge.selected ? 2.4 : EDGE_STROKE_WIDTH,
            strokeOpacity: isLit
              ? edge.selected || isPath
                ? 1
                : BEAM_OPACITY
              : BEAM_OPACITY_DIMMED,
          }),
        };
      }),
    [edges, nodeMap, selectedNode, selectedEdge, pathHighlight]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (activeTool !== 'interact') return;
      setSelectedElement(node as AppNode, null);
    },
    [activeTool, setSelectedElement]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (activeTool !== 'interact') return;
      setSelectedElement(null, edge as AppEdge);
    },
    [activeTool, setSelectedElement]
  );

  const handlePaneClick = useCallback(
    () => {
      if (activeTool === 'interact') {
        setSelectedElement(null, null);
      }
    },
    [activeTool, setSelectedElement]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool !== 'interact') return;

      const target = event.target as HTMLElement | null;
      if (!target?.closest('.react-flow__pane')) return;

      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(position);
    },
    [activeTool, addNode, screenToFlowPosition]
  );

  const handleAddNode = useCallback(() => {
    const randomOffset = () => Math.floor(Math.random() * 120) - 60;
    addNode({ x: 300 + randomOffset(), y: 220 + randomOffset() });
    setActiveTool('interact');
  }, [addNode]);

  const handleToolChange = useCallback(
    (tool: GraphTool) => {
      setActiveTool(tool);
      if (tool !== 'interact') setSelectedElement(null, null);
    },
    [setSelectedElement]
  );

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView]);

  const nodesDraggable = activeTool === 'interact';
  const nodesConnectable = activeTool === 'connect';
  const elementsSelectable = activeTool === 'interact';
  const panOnDrag = activeTool === 'interact';

  return (
    <div className="space-field relative h-full w-full overflow-hidden">
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
          onAddNode={handleAddNode}
        />
      </div>

      <GraphHud activeTool={activeTool} onFitView={handleFitView} />

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