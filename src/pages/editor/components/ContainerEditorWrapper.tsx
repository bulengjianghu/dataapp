import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import type { Node } from "../../../types/schema/node";

export function ContainerEditorWrapper({
  node,
  depth,
  selected,
  onSelect,
  children,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `node:${node.id}`,
    data: {
      source: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setDropRef, isOver: isNodeOver } = useDroppable({
    id: `drop:node:${node.id}`,
    data: {
      type: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setContainerRef, isOver: isContainerOver } = useDroppable({
    id: `drop:container:${node.id}`,
    data: {
      type: "container",
      containerId: node.id,
    },
  });

  return (
    <div style={{ marginLeft: depth * 12, marginBottom: 8 }}>
      <Card
        ref={(element) => {
          setNodeRef(element);
          setDropRef(element);
        }}
        {...listeners}
        {...attributes}
        size="small"
        style={{
          cursor: "grab",
          opacity: isDragging ? 0.55 : 1,
          transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
          borderStyle: "dashed",
          borderColor: selected ? "#1677ff" : isNodeOver ? "#1677ff" : undefined,
        }}
        title={
          <Space>
            <Tag color="blue">container</Tag>
            <Typography.Text>{(node.props.label as string | undefined) ?? node.id}</Typography.Text>
          </Space>
        }
        extra={
          <Typography.Link onClick={() => onSelect(node.id)} style={{ fontSize: 12 }}>
            选中
          </Typography.Link>
        }
      />
      <div
        ref={setContainerRef}
        style={{
          marginLeft: 12,
          marginTop: 8,
          border: "1px dashed #e5e7eb",
          borderColor: isContainerOver ? "#1677ff" : "#e5e7eb",
          borderRadius: 8,
          padding: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}
