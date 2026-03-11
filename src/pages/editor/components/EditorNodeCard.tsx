import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Space, Tag, Typography } from "antd";
import type { Node } from "../../../types/schema/node";

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

  return (
    <Card
      ref={(element) => {
        setNodeRef(element);
        setDropRef(element);
      }}
      {...listeners}
      {...attributes}
      size="small"
      style={{
        marginLeft: depth * 12,
        marginBottom: 8,
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        borderStyle: node.type === "container" ? "dashed" : "solid",
        borderColor: isOver ? "#1677ff" : selected ? "#1677ff" : undefined,
        boxShadow: selected ? "0 0 0 2px rgba(22, 119, 255, 0.18)" : undefined,
        background: selected ? "#f0f7ff" : undefined,
      }}
      onClick={() => onSelect(node.id)}
      title={
        <Space>
          <Tag color={node.type === "container" ? "blue" : "default"}>{node.type}</Tag>
          <Typography.Text>{label}</Typography.Text>
        </Space>
      }
    />
  );
}
