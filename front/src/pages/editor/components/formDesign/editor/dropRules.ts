import type { Node, NodesById, NodeType } from "../../../../../types/schema/node";

type DroppableNodeLike = Pick<Node, "type"> | null | undefined;

function resolveNodeType(node: DroppableNodeLike) {
  return node?.type ?? null;
}

export function canAcceptChild(
  parentNode: DroppableNodeLike,
  childNode: DroppableNodeLike
) {
  const parentType = resolveNodeType(parentNode);
  const childType = resolveNodeType(childNode);

  if (!parentType || !childType) {
    return false;
  }

  if (parentType === "detail_table") {
    return childType === "field";
  }

  return parentType === "page" || parentType === "container";
}

export function canMoveIntoParent(
  nodesById: NodesById,
  targetParentId: string,
  movingNode: DroppableNodeLike
) {
  const targetParent = nodesById[targetParentId];
  return canAcceptChild(targetParent, movingNode);
}
