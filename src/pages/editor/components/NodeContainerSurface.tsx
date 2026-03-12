import { useDndContext, useDroppable } from "@dnd-kit/core";
import { Empty } from "antd";
import type { ReactNode } from "react";
import type { NodesById } from "../../../types/schema/node";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

export function NodeContainerSurface({
  droppableId,
  droppableType,
  containerId,
  childIds,
  nodesById,
  selected,
  selectedNodeKey,
  emptyText,
  className,
  onSelect,
  children,
}: {
  droppableId: string;
  droppableType: "form-root" | "container";
  containerId: string;
  childIds: string[];
  nodesById: NodesById;
  selected: boolean;
  selectedNodeKey: string | null;
  emptyText: string;
  className: string;
  onSelect: (nodeId: string) => void;
  children?: ReactNode;
}) {
  const { active, over } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: droppableId,
    data:
      droppableType === "form-root"
        ? { type: "form-root" }
        : {
            type: "container",
            containerId,
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
    (droppableType === "form-root"
      ? overType === "form-root" ||
        (overType === "children-end" && overParentId === containerId) ||
        (overType === "node" && overNodeParentId === containerId)
      : (overType === "container" && overContainerId === containerId) ||
        (overType === "children-end" && overParentId === containerId) ||
        (overType === "node" && overNodeParentId === containerId));

  return (
    <div
      ref={setNodeRef}
      className={[className, childIds.length === 0 ? "is-empty" : "", isOver ? "is-over" : "", selected ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(containerId)}
    >
      {children}
      {childIds.length > 0 ? (
        <div className="editor-node-grid">
          <NodeChildrenRenderer
            nodesById={nodesById}
            childIds={childIds}
            depth={droppableType === "form-root" ? 0 : 1}
            emptyText={emptyText}
            selectedNodeKey={selectedNodeKey}
            parentId={containerId}
            onSelect={onSelect}
          />
        </div>
      ) : (
        <div className="editor-canvas__empty">
          <Empty description={emptyText} />
        </div>
      )}
    </div>
  );
}
