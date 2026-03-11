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
        style={{ height: "100%" }}
        bodyStyle={{ height: "calc(100% - 38px)", padding: 0, display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            height: "100%",
            minHeight: 360,
            background: "#ffffff",
            overflow: "auto",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <Empty description="页面根节点缺失（page_root）" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="设计画布"
      size="small"
      style={{ height: "100%" }}
      bodyStyle={{ height: "calc(100% - 38px)", padding: 0, display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          height: "100%",
          minHeight: 360,
          background: "#ffffff",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          ref={setNodeRef}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            border: "1px dashed #d1d5db",
            borderColor: isOver ? "#1677ff" : "#d1d5db",
            borderRadius: 8,
            padding: 12,
            flex: 1,
            boxSizing: "border-box",
          }}
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
            <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 24 }}>
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
