import { useMemo } from 'react';
import type { AppNode, AppEdge } from '../types/graph';

interface UseEdgeDirectionLogicResult {
  existingDirectedEdge: AppEdge | null;
  shouldReverseToRespectExisting: boolean;
  selectedEdgeSourceNode: AppNode | null;
  selectedEdgeTargetNode: AppNode | null;
  sourceLabel: string;
  targetLabel: string;
  nextDirectedSource: string;
  nextDirectedTarget: string;
  nextSourceLabel: string;
  nextTargetLabel: string;
}

export const useEdgeDirectionLogic = (
  selectedEdge: AppEdge | null,
  nodes: AppNode[],
  edges: AppEdge[]
): UseEdgeDirectionLogicResult => {
  const existingDirectedEdge = useMemo(() => {
    if (!selectedEdge) return null;

    return (
      edges.find(
        (edge) =>
          edge.id !== selectedEdge.id &&
          edge.data?.is_directed === true &&
          (
            (edge.source === selectedEdge.source && edge.target === selectedEdge.target) ||
            (edge.source === selectedEdge.target && edge.target === selectedEdge.source)
          )
      ) ?? null
    );
  }, [edges, selectedEdge]);

  const shouldReverseToRespectExisting = Boolean(
    selectedEdge &&
      existingDirectedEdge &&
      (selectedEdge.source !== existingDirectedEdge.target ||
        selectedEdge.target !== existingDirectedEdge.source)
  );

  const selectedEdgeSourceNode = selectedEdge
    ? nodes.find((node) => node.id === selectedEdge.source) ?? null
    : null;

  const selectedEdgeTargetNode = selectedEdge
    ? nodes.find((node) => node.id === selectedEdge.target) ?? null
    : null;

  const sourceLabel = selectedEdgeSourceNode?.data?.label ?? selectedEdge?.source ?? '';
  const targetLabel = selectedEdgeTargetNode?.data?.label ?? selectedEdge?.target ?? '';

  const nextDirectedSource = shouldReverseToRespectExisting && existingDirectedEdge
    ? existingDirectedEdge.target
    : selectedEdge?.source ?? '';

  const nextDirectedTarget = shouldReverseToRespectExisting && existingDirectedEdge
    ? existingDirectedEdge.source
    : selectedEdge?.target ?? '';

  const nextSourceNode = nodes.find((node) => node.id === nextDirectedSource);
  const nextTargetNode = nodes.find((node) => node.id === nextDirectedTarget);

  const nextSourceLabel = nextSourceNode?.data?.label ?? nextDirectedSource;
  const nextTargetLabel = nextTargetNode?.data?.label ?? nextDirectedTarget;

  return {
    existingDirectedEdge,
    shouldReverseToRespectExisting,
    selectedEdgeSourceNode,
    selectedEdgeTargetNode,
    sourceLabel,
    targetLabel,
    nextDirectedSource,
    nextDirectedTarget,
    nextSourceLabel,
    nextTargetLabel,
  };
};