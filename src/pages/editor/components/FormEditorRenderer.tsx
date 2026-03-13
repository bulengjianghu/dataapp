import { Card, Empty } from "antd";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { deleteNode, selectNode } from "../../../store/slices/formSchemaSlice";
import { EditorRootSurface } from "./EditorRootSurface";
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
        <EditorRootSurface
          containerId={pageRoot.id}
          childIds={childrenIds}
          nodesById={nodesById}
          selected={selectedNodeKey === pageRoot.id}
          selectedNodeKey={selectedNodeKey}
          emptyText={pageDefinition.emptyText ?? "空画布"}
          onSelect={(id) => dispatch(selectNode(id))}
          onDelete={(id) => dispatch(deleteNode(id))}
        />
      </div>
    </Card>
  );
}
