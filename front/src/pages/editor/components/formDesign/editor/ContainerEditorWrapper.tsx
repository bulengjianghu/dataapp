import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { MouseEvent } from "react";
import type { Node, NodesById } from "../../../../../types/schema/node";
import { EditorContainerSurface } from "./EditorContainerSurface";
import { EditorContainerFrame } from "./EditorContainerFrame";
import { SelectionOutline } from "./SelectionOutline";

export function ContainerEditorWrapper({
  node,
  depth: _depth,
  selected,
  onSelect,
  onDelete,
  nodesById,
  selectedNodeKey,
  interactive = true,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  nodesById: NodesById;
  selectedNodeKey: string | null;
  interactive?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    disabled: !interactive,
    data: {
      source: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setHeadDropRef, isOver: isOverHead } = useDroppable({
    id: `drop:container-head:${node.id}`,
    disabled: !interactive,
    data: {
      type: "node",
      nodeId: node.id,
    },
  });
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onSelect(node.id);
  };
  const isDetailTable = node.type === "detail_table";
  const title =
    (isDetailTable ? node.props.title : node.props.label) as string | undefined;
  const description = (node.props.description as string | undefined) ?? (isDetailTable ? "将字段拖入明细表中形成列" : undefined);

  return (
    <SelectionOutline
      nodeId={node.id}
      selected={selected}
      deleteMessage="删除容器后，其下所有子组件会一并删除"
      onDelete={() => onDelete?.(node.id)}
    >
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={[
          "editor-container",
          isDragging ? "is-dragging" : "",
          !interactive ? "is-overlay" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={interactive ? handleClick : undefined}
      >
        <div
          onClick={() => onSelect(node.id)}
        >
          <EditorContainerSurface
            variant={isDetailTable ? "detail_table" : "container"}
            droppableId={`drop:container:${node.id}`}
            containerId={node.id}
            childIds={node.childrenIds}
            nodesById={nodesById}
            selected={selected}
            selectedNodeKey={selectedNodeKey}
            emptyText="容器为空（可投放区域）"
            depth={1}
            onSelect={onSelect}
            onDelete={(nodeId) => onDelete?.(nodeId)}
            renderFrame={(content, { isOver }) => (
              <EditorContainerFrame
                isOver={isOver}
                required={Boolean(node.props.required)}
                tagLabel={isDetailTable ? (title || "明细表") : (title || "容器")}
                tagColor={isDetailTable ? "cyan" : "blue"}
                description={description}
                headDropRef={setHeadDropRef}
                headDropOver={isOverHead}
              >
                {content}
              </EditorContainerFrame>
            )}
          />
        </div>
      </div>
    </SelectionOutline>
  );
}
