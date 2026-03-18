import { useDndContext } from "@dnd-kit/core";
import { Card, Typography } from "antd";
import type { NodesById } from "../../../../../types/schema/node";
import { ContainerEditorWrapper } from "./ContainerEditorWrapper";
import { EditorNodeCard } from "./EditorNodeCard";

function depthClass(depth: number) {
  return `editor-depth-${Math.min(depth, 6)}`;
}

export function NodeChildrenRenderer({
  nodesById,
  childIds,
  depth,
  emptyText,
  selectedNodeKey,
  onSelect,
  onDelete,
  parentId,
  layoutMode = "grid",
}: {
  nodesById: NodesById;
  childIds: string[];
  depth: number;
  emptyText: string;
  selectedNodeKey: string | null;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  parentId: string;
  layoutMode?: "grid" | "detail-table";
}) {
  const { active, over } = useDndContext();
  const activeSource = active?.data.current?.source;
  const showDropTargetState = activeSource === "node" || activeSource === "palette";

  if (childIds.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <>
      {childIds.map((childId) => {
        if (!nodesById[childId]) {
          return (
            <Card key={childId} size="small" className={`editor-node-missing ${depthClass(depth)}`}>
              <Typography.Text type="danger">节点缺失: {childId}</Typography.Text>
            </Card>
          );
        }

        const node = nodesById[childId];
        const span = typeof node.layout.span === "number" ? Math.max(6, Math.min(24, node.layout.span)) : 24;
        const columnWidth = typeof node.props.columnWidth === "number" ? Math.max(200, node.props.columnWidth) : 200;
        const entryStyle =
          layoutMode === "detail-table"
            ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, flex: "0 0 auto" }
            : { gridColumn: `span ${span}` };
        const isNodeDropTarget =
          over?.data.current?.type === "node" &&
          over.data.current.nodeId === childId &&
          showDropTargetState;
        const entryClassName = [
          "editor-node-entry",
          depthClass(depth),
          layoutMode === "detail-table" ? "editor-node-entry--detail-column" : "",
          isNodeDropTarget ? "is-drop-target" : "",
        ]
          .filter(Boolean)
          .join(" ");

        if (node.type !== "container" && node.type !== "detail_table") {
          return (
            <div
              key={childId}
              className={entryClassName}
              style={entryStyle}
            >
              <EditorNodeCard
                node={node}
                depth={depth}
                selected={selectedNodeKey === node.id}
                dropTarget={isNodeDropTarget}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </div>
          );
        }

        return (
          <div
            key={childId}
            className={entryClassName}
            style={entryStyle}
          >
            <ContainerEditorWrapper
              node={node}
              depth={depth}
              selected={selectedNodeKey === node.id}
              onSelect={onSelect}
              onDelete={onDelete}
              nodesById={nodesById}
              selectedNodeKey={selectedNodeKey}
            />
          </div>
        );
      })}
    </>
  );
}
