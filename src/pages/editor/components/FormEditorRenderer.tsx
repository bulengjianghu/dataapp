import { Card, Empty } from "antd";
import { NodeContainerSurface } from "./NodeContainerSurface";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { selectNode } from "../../../store/slices/formSchemaSlice";
import { getPageNodeDefinition } from "./nodes";

export function FormEditorRenderer() {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const pageDefinition = getPageNodeDefinition();

  if (!pageRoot) {
    return (
      <Card
        title={pageDefinition.canvasTitle}
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
      title={pageDefinition.canvasTitle}
      size="small"
      className="editor-canvas"
      classNames={{ body: "editor-canvas__body" }}
    >
      <div className="editor-canvas__surface">
        <NodeContainerSurface
          droppableId="drop:form-root"
          droppableType="form-root"
          containerId={pageRoot.id}
          childIds={childrenIds}
          nodesById={nodesById}
          selected={selectedNodeKey === pageRoot.id}
          selectedNodeKey={selectedNodeKey}
          emptyText={pageDefinition.emptyText ?? "空画布"}
          className="editor-canvas__root"
          onSelect={(id) => dispatch(selectNode(id))}
        />
      </div>
    </Card>
  );
}
