import { useDroppable } from "@dnd-kit/core";
import type { Node, NodesById } from "../../../types/schema/node";
import { EditorNodeCard } from "./EditorNodeCard";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";

function depthClass(depth: number) {
  return `editor-depth-${Math.min(depth, 6)}`;
}

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
    <div className={`editor-container ${depthClass(depth)}`}>
      <EditorNodeCard node={node} depth={0} selected={selected} onSelect={onSelect} />
      <div
        ref={setContainerRef}
        className={`editor-container__children${isContainerOver ? " is-over" : ""}`}
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
