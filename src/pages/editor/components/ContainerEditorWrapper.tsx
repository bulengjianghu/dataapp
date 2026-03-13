import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import type { MouseEvent } from "react";
import type { Node, NodesById } from "../../../types/schema/node";
import { EditorContainerFrame } from "./EditorContainerFrame";
import { SelectionOutline } from "./SelectionOutline";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

export function ContainerEditorWrapper({
  node,
  depth: _depth,
  selected,
  onSelect,
  onDelete,
  nodesById,
  selectedNodeKey,
  interactive = true,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  nodesById: NodesById;
  selectedNodeKey: string | null;
  interactive?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    disabled: !interactive,
    data: {
      source: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setContainerDropRef } = useDroppable({
    id: `drop:container:${node.id}`,
    disabled: !interactive,
    data: {
      type: "container",
      containerId: node.id,
    },
  });
  const { setNodeRef: setHeadDropRef, isOver: isOverHead } = useDroppable({
    id: `drop:container-head:${node.id}`,
    disabled: !interactive,
    data: {
      type: "node",
      nodeId: node.id,
    },
  });
  const { active, over } = useDndContext();
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onSelect(node.id);
  };
  const activeSource = active?.data.current?.source;
  const showHighlight = activeSource === "node" || activeSource === "palette";
  const overType = over?.data.current?.type;
  const overContainerId = over?.data.current?.containerId;
  const overParentId = over?.data.current?.parentId;
  const overNodeId = over?.data.current?.nodeId;
  const overNodeParentId = typeof overNodeId === "string" ? nodesById[overNodeId]?.parentId : null;
  const isOver =
    showHighlight &&
    ((overType === "container" && overContainerId === node.id) ||
      (overType === "children-end" && overParentId === node.id) ||
      (overType === "node" && overNodeParentId === node.id));

  return (
    <SelectionOutline
      selected={selected}
      deleteMessage="删除容器后，其下所有子组件会一并删除"
      onDelete={() => onDelete?.(node.id)}
    >
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={[
          "editor-container",
          isDragging ? "is-dragging" : "",
          !interactive ? "is-overlay" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={interactive ? handleClick : undefined}
      >
        <div
          ref={setContainerDropRef}
          onClick={() => onSelect(node.id)}
        >
          <EditorContainerFrame
            isOver={isOver}
            required={Boolean(node.props.required)}
            hasChildren={node.childrenIds.length > 0}
            emptyText="容器为空（可投放区域）"
            headDropRef={setHeadDropRef}
            headDropOver={isOverHead}
          >
            <NodeChildrenRenderer
              nodesById={nodesById}
              childIds={node.childrenIds}
              depth={1}
              emptyText="容器为空（可投放区域）"
              selectedNodeKey={selectedNodeKey}
              parentId={node.id}
              onSelect={onSelect}
              onDelete={(nodeId) => onDelete?.(nodeId)}
            />
          </EditorContainerFrame>
        </div>
      </div>
    </SelectionOutline>
  );
}
