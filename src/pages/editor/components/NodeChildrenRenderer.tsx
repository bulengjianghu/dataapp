import { useDndContext, useDroppable } from "@dnd-kit/core";
import { Card, Typography } from "antd";
import type { NodesById } from "../../../types/schema/node";
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
  parentId,
}: {
  nodesById: NodesById;
  childIds: string[];
  depth: number;
  emptyText: string;
  selectedNodeKey: string | null;
  onSelect: (nodeId: string) => void;
  parentId: string;
}) {
  const { active, over } = useDndContext();
  const activeSource = active?.data.current?.source;
  const showInsertMarkers = activeSource === "node" || activeSource === "palette";
  const { setNodeRef: setEndDropRef } = useDroppable({
    id: `drop:end:${parentId}`,
    data: {
      type: "children-end",
      parentId,
      index: childIds.length,
    },
  });
  const showInsertAtEnd =
    showInsertMarkers &&
    over?.data.current?.type === "children-end" &&
    over.data.current.parentId === parentId;

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
        const showInsertBefore =
          over?.data.current?.type === "node" &&
          over.data.current.nodeId === childId &&
          showInsertMarkers;

        if (node.type !== "container") {
          return (
            <div
              key={childId}
              className={`editor-node-entry ${depthClass(depth)}`}
              style={{ gridColumn: `span ${span}` }}
            >
              {showInsertBefore ? <div className="editor-node-insert-marker" aria-hidden="true" /> : null}
              <EditorNodeCard node={node} depth={depth} selected={selectedNodeKey === node.id} onSelect={onSelect} />
            </div>
          );
        }

        return (
          <div
            key={childId}
            className={`editor-node-entry ${depthClass(depth)}`}
            style={{ gridColumn: `span ${span}` }}
          >
            {showInsertBefore ? <div className="editor-node-insert-marker" aria-hidden="true" /> : null}
            <ContainerEditorWrapper
              node={node}
              depth={depth}
              selected={selectedNodeKey === node.id}
              onSelect={onSelect}
              nodesById={nodesById}
              selectedNodeKey={selectedNodeKey}
            />
          </div>
        );
      })}
      <div ref={setEndDropRef} className="editor-node-end-dropzone">
        {showInsertAtEnd ? <div className="editor-node-insert-marker" aria-hidden="true" /> : null}
      </div>
    </>
  );
}
