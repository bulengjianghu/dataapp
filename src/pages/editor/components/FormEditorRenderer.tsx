import { useDroppable } from "@dnd-kit/core";
import { Card, Empty, Typography } from "antd";
import { PAGE_NODE_ID } from "../../../types/schema/node";
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
  const { setNodeRef, isOver } = useDroppable({
    id: "drop:form-root",
    data: { type: "form-root" },
  });

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
          className={`editor-canvas__root${isOver ? " is-over" : ""}`}
        >
          {childrenIds.length > 0 ? (
            <NodeChildrenRenderer
              nodesById={nodesById}
              childIds={childrenIds}
              depth={0}
              emptyText="空画布：请从左侧组件面板添加组件"
              selectedNodeKey={selectedNodeKey}
              onSelect={(id) => dispatch(selectNode(id))}
            />
          ) : (
            <div className="editor-canvas__empty">
              <Empty description="空画布：请从左侧组件面板添加组件">
                <Typography.Link onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>
                  选中根节点
                </Typography.Link>
              </Empty>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
