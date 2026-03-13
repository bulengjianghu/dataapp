import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Flex, Typography } from "antd";
import { memo, type MouseEvent } from "react";
import type { Node } from "../../../../../types/schema/node";
import { renderEditorNodePreview } from "../../nodes";
import { SelectionOutline } from "./SelectionOutline";

function depthClass(depth: number) {
  return `editor-depth-${Math.min(depth, 6)}`;
}

function EditorNodeCardInner({
  node,
  depth,
  selected,
  onSelect,
  onDelete,
  interactive = true,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:node:${node.id}`,
    disabled: !interactive,
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
    <SelectionOutline
      nodeId={node.id}
      selected={selected}
      deleteMessage="删除后不可恢复"
      onDelete={() => onDelete?.(node.id)}
    >
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
          isDragging ? "is-dragging" : "",
          !interactive ? "is-overlay" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={interactive ? handleClick : undefined}
      >
        <Flex vertical gap={8} className="editor-node-card__content">
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
    </SelectionOutline>
  );
}

export const EditorNodeCard = memo(
  EditorNodeCardInner,
  (previousProps, nextProps) =>
    previousProps.node === nextProps.node &&
    previousProps.depth === nextProps.depth &&
    previousProps.selected === nextProps.selected &&
    previousProps.interactive === nextProps.interactive
);
