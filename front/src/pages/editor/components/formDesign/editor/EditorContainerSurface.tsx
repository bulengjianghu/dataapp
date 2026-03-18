import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { NodesById } from "../../../../../types/schema/node";
import { ContainerLayout } from "../shared/ContainerLayout";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

type SurfaceVariant = "root" | "container" | "detail_table";

export function EditorContainerSurface({
  variant,
  droppableId,
  containerId,
  childIds,
  nodesById,
  selected,
  selectedNodeKey,
  emptyText,
  depth,
  onSelect,
  onDelete,
  renderFrame,
}: {
  variant: SurfaceVariant;
  droppableId: string;
  containerId: string;
  childIds: string[];
  nodesById: NodesById;
  selected: boolean;
  selectedNodeKey: string | null;
  emptyText: string;
  depth: number;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  renderFrame?: (content: ReactNode, state: { isOver: boolean; hasChildren: boolean }) => ReactNode;
}) {
  const { active, over } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: droppableId,
    data:
      variant === "root"
        ? { type: "form-root" }
        : {
            type: "container",
            containerId,
            containerType: variant,
          },
  });

  const activeSource = active?.data.current?.source;
  const showHighlight = activeSource === "node" || activeSource === "palette";
  const overType = over?.data.current?.type;
  const overContainerId = over?.data.current?.containerId;
  const overParentId = over?.data.current?.parentId;
  const overNodeId = over?.data.current?.nodeId;
  const overNodeParentId = typeof overNodeId === "string" ? nodesById[overNodeId]?.parentId : null;
  const isOver =
    showHighlight &&
    (variant === "root"
      ? overType === "form-root" ||
        (overType === "node" && overNodeParentId === containerId)
      : (overType === "container" && overContainerId === containerId) ||
        (overType === "node" && overNodeParentId === containerId));

  const content = (
    <ContainerLayout
      hasChildren={childIds.length > 0}
      emptyText={emptyText}
      className={variant === "detail_table" ? "node-layout__detail-table" : undefined}
    >
      <NodeChildrenRenderer
        nodesById={nodesById}
        childIds={childIds}
        depth={depth}
        emptyText={emptyText}
        selectedNodeKey={selectedNodeKey}
        parentId={containerId}
        layoutMode={variant === "detail_table" ? "detail-table" : "grid"}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </ContainerLayout>
  );

  return (
    <div
      ref={setNodeRef}
      data-editor-node-id={containerId}
      className={
        variant === "root"
          ? ["editor-canvas__root", childIds.length === 0 ? "is-empty" : "", isOver ? "is-over" : "", selected ? "is-selected" : ""]
              .filter(Boolean)
              .join(" ")
          : undefined
      }
      onClick={() => onSelect(containerId)}
    >
      {renderFrame ? renderFrame(content, { isOver, hasChildren: childIds.length > 0 }) : content}
    </div>
  );
}
