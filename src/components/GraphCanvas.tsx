import React, { useCallback, useMemo, useState } from 'react';

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
} from 'reactflow';

import type {
  NodeMouseHandler,
  EdgeMouseHandler,
} from 'reactflow';

import 'reactflow/dist/style.css';

import { useGraphStore } from '../store/useGraphStore';

import type {
  AppNode,
  AppEdge,
} from '../types/graph';

import CircularNode from './CircularNode';

import GraphToolbar from './GraphToolbar';
import type { GraphTool } from '../types/graph';
import { WeightedStraightEdge } from './edges/WeightedStraightEdge';
import { GraphHud } from './GraphHud';
import { BRAND_COLOR, EDGE_STROKE_WIDTH, createEdgeStyle } from '../lib/graphEdge';
import {
  getDynamicEdgeHandles,
  getSelfLoopHandles,
  getBidirectionalCurveInfo,
  getSelfLoopInfo,
  NO_CURVE,
  NO_SELF_LOOP,
} from '../lib/graphGeometry';

const nodeTypes = {
  circularGraphNode: CircularNode,
};

const edgeTypes = {
  weightedStraightEdge: WeightedStraightEdge,
};

const CanvasContent: React.FC = () => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [activeTool, setActiveTool] = useState<GraphTool>('interact');

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedElement,
  } = useGraphStore();

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

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
          },
          zIndex: edge.selected ? 40 : 20,
          style: createEdgeStyle({
            strokeWidth: edge.selected ? 3 : 2.5,
          }),
        };
      }),
    [edges, nodeMap]
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
    <div className="relative h-full w-full overflow-hidden bg-surface-muted">
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
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
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
        connectionLineStyle={{ stroke: BRAND_COLOR, strokeWidth: EDGE_STROKE_WIDTH }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cbd5e1" />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!m-4 !overflow-hidden !rounded-xl !border !border-border !bg-surface !shadow-lg"
        />
        <MiniMap
          position="top-right"
          nodeColor={BRAND_COLOR}
          maskColor="rgba(248, 250, 252, 0.78)"
          nodeStrokeWidth={2}
          pannable
          zoomable
          className="!m-4 !overflow-hidden !rounded-xl !border !border-border !bg-surface !shadow-lg"
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