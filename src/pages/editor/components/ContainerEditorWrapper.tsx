import { useDroppable } from "@dnd-kit/core";
import type { Node, NodesById } from "../../../types/schema/node";
import { EditorNodeCard } from "./EditorNodeCard";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

export function ContainerEditorWrapper({
  node,
  depth,
  selected,
  onSelect,
  nodesById,
  selectedNodeKey,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  nodesById: NodesById;
  selectedNodeKey: string | null;
}) {
  const { setNodeRef: setContainerRef, isOver: isContainerOver } = useDroppable({
    id: `drop:container:${node.id}`,
    data: {
      type: "container",
      containerId: node.id,
    },
  });

  return (
    <div style={{ marginLeft: depth * 12, marginBottom: 8 }}>
      <EditorNodeCard node={node} depth={0} selected={selected} onSelect={onSelect} />
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
        <NodeChildrenRenderer
          nodesById={nodesById}
          childIds={node.childrenIds}
          depth={depth + 1}
          emptyText="容器为空（可投放区域）"
          selectedNodeKey={selectedNodeKey}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
