import { Badge, Button, Space, Tag, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { markDirty, selectNode, setFormId, setNodesById } from "../../../store/slices/formSchemaSlice";
import {
  selectDirty,
  selectFormId,
  selectNodesById,
  selectHistoryFutureCount,
  selectHistoryPastCount,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { PAGE_NODE_ID } from "../../../types/schema/node";
import { ComponentPalette } from "./ComponentPalette";
import { EditorDndContextProvider, useEditorDndStatus } from "./EditorDndContext";
import { FormEditorRenderer } from "./FormEditorRenderer";
import { PropertyPanel } from "./PropertyPanel";
import { publishFormLocally, saveDraftLocally, validateBeforePublish } from "../services/formPersistence";

function EditorShellContent() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const dirty = useAppSelector(selectDirty);
  const formId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const undoCount = useAppSelector(selectHistoryPastCount);
  const redoCount = useAppSelector(selectHistoryFutureCount);
  const { activeId, overId } = useEditorDndStatus();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const result = await saveDraftLocally({ formId, nodesById });
      dispatch(setFormId(result.formId));
      dispatch(setNodesById(result.nodesById));
      dispatch(markDirty(false));
      messageApi.success("草稿已保存到本地");
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    const errors = validateBeforePublish(nodesById, PAGE_NODE_ID);
    if (errors.length > 0) {
      messageApi.error(errors[0]);
      return;
    }

    setPublishing(true);
    try {
      const saved = await saveDraftLocally({ formId, nodesById });
      dispatch(setFormId(saved.formId));
      dispatch(setNodesById(saved.nodesById));
      await publishFormLocally({ formId: saved.formId, nodesById: saved.nodesById });
      dispatch(markDirty(false));
      messageApi.success("表单已发布到本地记录");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="editor-shell">
      {contextHolder}
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
          <Button loading={saving} disabled={!dirty && !formId} onClick={saveDraft}>
            保存草稿
          </Button>
          <Button onClick={() => navigate("/preview")}>预览</Button>
          <Button type="primary" loading={publishing} onClick={publishForm}>
            发布
          </Button>
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
