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
}: {
  nodesById: NodesById;
  childIds: string[];
  depth: number;
  emptyText: string;
  selectedNodeKey: string | null;
  onSelect: (nodeId: string) => void;
}) {
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

        if (node.type !== "container") {
          return (
            <EditorNodeCard
              key={childId}
              node={node}
              depth={depth}
              selected={selectedNodeKey === node.id}
              onSelect={onSelect}
            />
          );
        }

        return (
          <ContainerEditorWrapper
            key={childId}
            node={node}
            depth={depth}
            selected={selectedNodeKey === node.id}
            onSelect={onSelect}
            nodesById={nodesById}
            selectedNodeKey={selectedNodeKey}
          />
        );
      })}
    </>
  );
}
