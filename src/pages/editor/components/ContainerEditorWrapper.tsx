import type { Node, NodesById } from "../../../types/schema/node";
import { EditorNodeCard } from "./EditorNodeCard";
import { NodeContainerSurface } from "./NodeContainerSurface";

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
  return (
    <div className={`editor-container ${depthClass(depth)}`}>
      <EditorNodeCard node={node} depth={0} selected={selected} onSelect={onSelect} />
      <NodeContainerSurface
        droppableId={`drop:container:${node.id}`}
        droppableType="container"
        containerId={node.id}
        childIds={node.childrenIds}
        nodesById={nodesById}
        selected={false}
        selectedNodeKey={selectedNodeKey}
        emptyText="容器为空（可投放区域）"
        className="editor-container__children"
        onSelect={onSelect}
      />
    </div>
  );
}
