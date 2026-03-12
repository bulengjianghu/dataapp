import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Flex, Tag, Typography } from "antd";
import type { MouseEvent } from "react";
import type { Node } from "../../../types/schema/node";
import { renderEditorNodePreview } from "./nodes";

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
      classNames={{ body: "editor-node-card__body" }}
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
    >
      <Flex vertical gap={8} className="editor-node-card__content">
        {node.type === "container" ? (
          <Flex align="center" gap={8} wrap>
            <Tag color="blue" className="editor-node-card__required">
              容器
            </Tag>
          </Flex>
        ) : null}
        <div className="editor-node-card__preview-wrap">
          {Boolean(node.props.required) ? (
            <span aria-label="必填" className="editor-node-card__required-mark">
              *
            </span>
          ) : null}
          <div className={["editor-node-card__preview", isOver ? "is-over" : ""].filter(Boolean).join(" ")}>
            {renderEditorNodePreview(node)}
          </div>
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
