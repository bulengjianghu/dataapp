import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { NodesById } from "../../../types/schema/node";
import { ContainerLayout } from "./ContainerLayout";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

export function EditorRootSurface({
  containerId,
  childIds,
  nodesById,
  selected,
  selectedNodeKey,
  emptyText,
  onSelect,
  onDelete,
}: {
  containerId: string;
  childIds: string[];
  nodesById: NodesById;
  selected: boolean;
  selectedNodeKey: string | null;
  emptyText: string;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const { active, over } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: "drop:form-root",
    data: { type: "form-root" },
  });

  const activeSource = active?.data.current?.source;
  const showHighlight = activeSource === "node" || activeSource === "palette";
  const overType = over?.data.current?.type;
  const overParentId = over?.data.current?.parentId;
  const overNodeId = over?.data.current?.nodeId;
  const overNodeParentId = typeof overNodeId === "string" ? nodesById[overNodeId]?.parentId : null;
  const isOver =
    showHighlight &&
    (overType === "form-root" ||
      (overType === "children-end" && overParentId === containerId) ||
      (overType === "node" && overNodeParentId === containerId));

  return (
    <div
      ref={setNodeRef}
      className={["editor-canvas__root", childIds.length === 0 ? "is-empty" : "", isOver ? "is-over" : "", selected ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(containerId)}
    >
      <ContainerLayout
        hasChildren={childIds.length > 0}
        emptyText={emptyText}
      >
        <NodeChildrenRenderer
          nodesById={nodesById}
          childIds={childIds}
          depth={0}
          emptyText={emptyText}
          selectedNodeKey={selectedNodeKey}
          parentId={containerId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </ContainerLayout>
    </div>
  );
}
