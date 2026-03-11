import { Badge, Button, Space, Tag, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { markDirty, selectNode } from "../../../store/slices/formSchemaSlice";
import {
  selectDirty,
  selectHistoryFutureCount,
  selectHistoryPastCount,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { PAGE_NODE_ID } from "../../../types/schema/node";
import { ComponentPalette } from "./ComponentPalette";
import { EditorDndContextProvider, useEditorDndStatus } from "./EditorDndContext";
import { FormEditorRenderer } from "./FormEditorRenderer";
import { PropertyPanel } from "./PropertyPanel";

function EditorShellContent() {
  const dispatch = useAppDispatch();
  const dirty = useAppSelector(selectDirty);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const undoCount = useAppSelector(selectHistoryPastCount);
  const redoCount = useAppSelector(selectHistoryFutureCount);
  const { activeId, overId } = useEditorDndStatus();

  return (
    <div className="editor-shell">
      <header className="editor-shell__toolbar">
        <Space>
          <strong>单表单编辑器</strong>
          <Tag color={dirty ? "orange" : "green"}>{dirty ? "未保存" : "已保存"}</Tag>
          {selectedNodeKey ? (
            <Typography.Text type="secondary">选中: {selectedNodeKey}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">未选择节点</Typography.Text>
          )}
          <Typography.Text type="secondary">Undo: {undoCount}</Typography.Text>
          <Typography.Text type="secondary">Redo: {redoCount}</Typography.Text>
          <Typography.Text type="secondary">DND active: {activeId ?? "-"}</Typography.Text>
          <Typography.Text type="secondary">DND over: {overId ?? "-"}</Typography.Text>
        </Space>
        <div className="editor-shell__toolbar-actions">
          <Badge status={dirty ? "processing" : "success"} />
          <Button disabled={!dirty} onClick={() => dispatch(markDirty(false))}>
            保存草稿
          </Button>
          <Button onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>预览</Button>
          <Button type="primary">发布</Button>
        </div>
      </header>

      <main className="editor-shell__content">
        <section className="editor-shell__panel">
          <ComponentPalette />
        </section>
        <section className="editor-shell__panel">
          <FormEditorRenderer />
        </section>
        <section className="editor-shell__panel">
          <PropertyPanel />
        </section>
      </main>
    </div>
  );
}

export function EditorShell() {
  return (
    <EditorDndContextProvider>
      <EditorShellContent />
    </EditorDndContextProvider>
  );
}
