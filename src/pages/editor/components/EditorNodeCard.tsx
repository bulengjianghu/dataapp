import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Flex, Space, Tag, Typography } from "antd";
import type { MouseEvent } from "react";
import type { Node } from "../../../types/schema/node";
import { getComponentTitle, renderEditorNodePreview } from "./nodes";

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
  const componentKey =
    typeof node.props.component === "string" ? node.props.component : node.type === "container" ? "container" : undefined;
  const helpText = typeof node.props.helpText === "string" ? node.props.helpText : "";
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
          {componentKey ? <Typography.Text type="secondary">{getComponentTitle(componentKey)}</Typography.Text> : null}
        </Space>
      }
    >
      <Flex vertical gap={8}>
        {Boolean(node.props.required) ? (
          <Tag color="red" className="editor-node-card__required">
            必填
          </Tag>
        ) : null}
        <div className={["editor-node-card__preview", isOver ? "is-over" : ""].filter(Boolean).join(" ")}>
          {renderEditorNodePreview(node)}
        </div>
        {helpText ? (
          <Typography.Text type="secondary" className="editor-node-card__help">
            {helpText}
          </Typography.Text>
        ) : null}
      </Flex>
    </Card>
  );
}
