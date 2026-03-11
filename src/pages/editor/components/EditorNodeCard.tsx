import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Space, Tag, Typography } from "antd";
import type { MouseEvent } from "react";
import type { Node } from "../../../types/schema/node";

function depthClass(depth: number) {
  return `editor-depth-${Math.min(depth, 6)}`;
}

export function EditorNodeCard({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    data: {
      source: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:node:${node.id}`,
    data: {
      type: "node",
      nodeId: node.id,
    },
  });
  const label = (node.props.label as string | undefined) ?? node.id;
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onSelect(node.id);
  };

  return (
    <Card
      ref={(element) => {
        setNodeRef(element);
        setDropRef(element);
      }}
      {...listeners}
      {...attributes}
      size="small"
      className={[
        "editor-node-card",
        depthClass(depth),
        node.type === "container" ? "is-container" : "",
        selected ? "is-selected" : "",
        isDragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      title={
        <Space>
          <Tag color={node.type === "container" ? "blue" : "default"}>{node.type}</Tag>
          <Typography.Text>{label}</Typography.Text>
        </Space>
      }
    />
  );
}
