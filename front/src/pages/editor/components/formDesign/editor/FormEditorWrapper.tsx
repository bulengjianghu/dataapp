import { RedoOutlined, UndoOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Space } from "antd";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
  selectSelectedNodeKey,
} from "../../../../../store/selectors/editorSelectors";
import { deleteNode, selectNode } from "../../../../../store/slices/formSchemaSlice";
import { getPageNodeDefinition } from "../../nodes";
import { EditorContainerSurface } from "./EditorContainerSurface";

type FormEditorWrapperProps = {
  undoDisabled: boolean;
  redoDisabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function FormEditorWrapper({ undoDisabled, redoDisabled, onUndo, onRedo }: FormEditorWrapperProps) {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const pageDefinition = getPageNodeDefinition();
  const canvasToolbar = (
    <div className="editor-canvas__toolbar">
      <Space size={8}>
        <Button icon={<UndoOutlined />} disabled={undoDisabled} onClick={onUndo}>
          撤销
        </Button>
        <Button icon={<RedoOutlined />} disabled={redoDisabled} onClick={onRedo}>
          重做
        </Button>
      </Space>
    </div>
  );

  useEffect(() => {
    if (!selectedNodeKey) {
      return;
    }

    const element = document.querySelector<HTMLElement>(`[data-editor-node-id="${selectedNodeKey}"]`);
    if (!element) {
      return;
    }

    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
  }, [selectedNodeKey]);

  if (!pageRoot) {
    return (
      <Card
        title={canvasToolbar}
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
      title={canvasToolbar}
      size="small"
      className="editor-canvas"
      classNames={{ body: "editor-canvas__body" }}
    >
      <div className="editor-canvas__surface">
        <EditorContainerSurface
          variant="root"
          droppableId="drop:form-root"
          containerId={pageRoot.id}
          childIds={childrenIds}
          nodesById={nodesById}
          selected={selectedNodeKey === pageRoot.id}
          selectedNodeKey={selectedNodeKey}
          emptyText={pageDefinition.emptyText ?? "空画布"}
          depth={0}
          onSelect={(id) => dispatch(selectNode(id))}
          onDelete={(id) => dispatch(deleteNode(id))}
        />
      </div>
    </Card>
  );
}
