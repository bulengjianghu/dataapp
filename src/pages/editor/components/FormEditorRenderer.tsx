import { useDndContext, useDroppable } from "@dnd-kit/core";
import { Card, Empty } from "antd";
import { NodeChildrenRenderer } from "./NodeChildrenRenderer";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { selectNode } from "../../../store/slices/formSchemaSlice";

export function FormEditorRenderer() {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const { active, over } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: "drop:form-root",
    data: { type: "form-root" },
  });
  const activeSource = active?.data.current?.source;
  const showRootHighlight = activeSource === "node" || activeSource === "palette";
  const overType = over?.data.current?.type;
  const overParentId = over?.data.current?.parentId;
  const overNodeId = over?.data.current?.nodeId;
  const overNodeParentId = typeof overNodeId === "string" ? nodesById[overNodeId]?.parentId : null;
  const isOver =
    showRootHighlight &&
    (overType === "form-root" ||
      (overType === "children-end" && overParentId === pageRoot?.id) ||
      (overType === "node" && overNodeParentId === pageRoot?.id));

  if (!pageRoot) {
    return (
      <Card
        title="设计画布"
        size="small"
        className="editor-canvas"
        classNames={{ body: "editor-canvas__body" }}
      >
        <div className="editor-canvas__surface">
          <Empty description="页面根节点缺失（page_root）" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="设计画布"
      size="small"
      className="editor-canvas"
      classNames={{ body: "editor-canvas__body" }}
    >
      <div className="editor-canvas__surface">
        <div
          ref={setNodeRef}
          className={[
            "editor-canvas__root",
            childrenIds.length === 0 ? "is-empty" : "",
            isOver ? "is-over" : "",
            selectedNodeKey === pageRoot.id ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => dispatch(selectNode(pageRoot.id))}
        >
          {childrenIds.length > 0 ? (
            <NodeChildrenRenderer
              nodesById={nodesById}
              childIds={childrenIds}
              depth={0}
              emptyText="空画布：请从左侧组件面板添加组件"
              selectedNodeKey={selectedNodeKey}
              parentId={pageRoot.id}
              onSelect={(id) => dispatch(selectNode(id))}
            />
          ) : (
            <div className="editor-canvas__empty">
              <Empty description="空画布：请从左侧组件面板添加组件" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
