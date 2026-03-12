import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Tag } from "antd";
import type { MouseEvent } from "react";
import type { Node, NodesById } from "../../../types/schema/node";
import { NodeContainerSurface } from "./NodeContainerSurface";

export function ContainerEditorWrapper({
  node,
  depth,
  selected,
  onSelect,
  nodesById,
  selectedNodeKey,
  interactive = true,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  nodesById: NodesById;
  selectedNodeKey: string | null;
  interactive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    disabled: !interactive,
    data: {
      source: "node",
      nodeId: node.id,
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
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onSelect(node.id);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "editor-container",
        selected ? "is-selected" : "",
        isDragging ? "is-dragging" : "",
        !interactive ? "is-overlay" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={interactive ? handleClick : undefined}
    >
      <NodeContainerSurface
        droppableId={`drop:container:${node.id}`}
        droppableType="container"
        containerId={node.id}
        childIds={node.childrenIds}
        nodesById={nodesById}
        selected={selected}
        selectedNodeKey={selectedNodeKey}
        emptyText="容器为空（可投放区域）"
        className="editor-container__children"
        onSelect={onSelect}
      >
        <div
          ref={setHeadDropRef}
          className={["editor-container__meta", "editor-container__head-dropzone", isOverHead ? "is-over" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {Boolean(node.props.required) ? (
            <span aria-label="必填" className="editor-node-card__required-mark editor-container__required-mark">
              *
            </span>
          ) : null}
          <Tag color="blue" className="editor-node-card__required">
            容器
          </Tag>
        </div>
      </NodeContainerSurface>
    </div>
  );
}
