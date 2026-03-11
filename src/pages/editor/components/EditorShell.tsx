import type { CSSProperties } from "react";
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

const shellStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "56px minmax(0, 1fr)",
  height: "100vh",
  background: "#f5f7fb",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr) 340px",
  gap: "12px",
  minHeight: 0,
  padding: "12px",
};

const panelStyle: CSSProperties = {
  height: "100%",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

function EditorShellContent() {
  const dispatch = useAppDispatch();
  const dirty = useAppSelector(selectDirty);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const undoCount = useAppSelector(selectHistoryPastCount);
  const redoCount = useAppSelector(selectHistoryFutureCount);
  const { activeId, overId } = useEditorDndStatus();

  return (
    <div style={shellStyle}>
      <header style={toolbarStyle}>
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge status={dirty ? "processing" : "success"} />
          <Button disabled={!dirty} onClick={() => dispatch(markDirty(false))}>
            保存草稿
          </Button>
          <Button onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>预览</Button>
          <Button type="primary">发布</Button>
        </div>
      </header>

      <main style={contentStyle}>
        <section style={panelStyle}>
          <ComponentPalette />
        </section>
        <section style={panelStyle}>
          <FormEditorRenderer />
        </section>
        <section style={panelStyle}>
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
