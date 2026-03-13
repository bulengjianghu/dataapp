import { RedoOutlined, UndoOutlined } from "@ant-design/icons";
import { Badge, Button, Space, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectDirty,
  selectFormId,
  selectNodesById,
  selectHistoryFutureCount,
  selectHistoryPastCount,
} from "../../../store/selectors/editorSelectors";
import { redo, undo } from "../../../store/slices/editorHistorySlice";
import { markDirty, setFormId, setNodesById } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID } from "../../../types/schema/node";
import { ComponentPalette } from "./leftPanel/ComponentPalette";
import { EditorDndContextProvider } from "./formDesign/editor/EditorDndContext";
import { FormEditorWrapper } from "./formDesign/editor/FormEditorWrapper";
import { PropertyPanel } from "./propertyPanel/PropertyPanel";
import { persistDraftLocally, publishFormLocally, saveDraftLocally, validateBeforePublish } from "../services/formPersistence";

const AUTO_SAVE_DELAY = 1500;

function getSaveTag(dirty: boolean, hasSavedDraft: boolean) {
  if (dirty || !hasSavedDraft) {
    return {
      color: "orange",
      label: "未保存",
    };
  }

  return {
    color: "green",
    label: "已保存",
  };
}

function formatSavedTime(timestamp: number | null) {
  if (!timestamp) {
    return "尚未保存草稿";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function EditorShellContent() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const dirty = useAppSelector(selectDirty);
  const formId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
  const undoCount = useAppSelector(selectHistoryPastCount);
  const redoCount = useAppSelector(selectHistoryFutureCount);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autoSavePending, setAutoSavePending] = useState(false);
  const hasSavedDraft = Boolean(formId) || lastSavedAt !== null;
  const latestStateRef = useRef({
    dirty,
    formId,
    nodesById,
  });

  useEffect(() => {
    latestStateRef.current = {
      dirty,
      formId,
      nodesById,
    };
  }, [dirty, formId, nodesById]);

  const saveSummary = useMemo(() => {
    if (publishing) {
      return "发布中";
    }
    if (saving) {
      return autoSavePending ? "自动保存中" : "保存中";
    }
    if (dirty) {
      return autoSavePending ? "等待自动保存" : "未保存";
    }
    if (!hasSavedDraft) {
      return "尚未保存草稿";
    }
    return `已保存 ${formatSavedTime(lastSavedAt)}`;
  }, [autoSavePending, dirty, hasSavedDraft, lastSavedAt, publishing, saving]);

  const saveTag = useMemo(() => getSaveTag(dirty, hasSavedDraft), [dirty, hasSavedDraft]);

  const commitSavedState = (result: { formId: string; nodesById: typeof nodesById }) => {
    dispatch(setFormId(result.formId));
    dispatch(setNodesById(result.nodesById));
    dispatch(markDirty(false));
    setLastSavedAt(Date.now());
  };

  const flushDraftSync = () => {
    const current = latestStateRef.current;
    const result = persistDraftLocally({
      formId: current.formId,
      nodesById: current.nodesById,
    });
    commitSavedState(result);
    return result;
  };

  const saveDraft = async () => {
    if (saving || publishing) {
      return null;
    }

    setSaving(true);

    try {
      const result = await saveDraftLocally({ formId, nodesById });
      commitSavedState(result);
      return result;
    } finally {
      setSaving(false);
      setAutoSavePending(false);
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
      commitSavedState(saved);
      await publishFormLocally({ formId: saved.formId, nodesById: saved.nodesById });
      messageApi.success("表单已发布到本地记录");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    if (!dirty || saving || publishing) {
      setAutoSavePending(false);
      return;
    }

    setAutoSavePending(true);
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, AUTO_SAVE_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dirty, formId, nodesById, publishing, saving]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || (!event.metaKey && !event.ctrlKey) || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        if (redoCount === 0) {
          return;
        }
        event.preventDefault();
        dispatch(redo());
        return;
      }

      if (key === "z") {
        if (undoCount === 0) {
          return;
        }
        event.preventDefault();
        dispatch(undo());
        return;
      }

      if (key === "y") {
        if (redoCount === 0) {
          return;
        }
        event.preventDefault();
        dispatch(redo());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch, redoCount, undoCount]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !latestStateRef.current.dirty) {
        return;
      }
      flushDraftSync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!latestStateRef.current.dirty) {
        return;
      }

      flushDraftSync();
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const shouldLeave = window.confirm("当前有未保存变更，离开当前页面前将尝试自动保存。是否继续离开？");
    if (shouldLeave) {
      if (latestStateRef.current.dirty) {
        flushDraftSync();
      }
      blocker.proceed();
      return;
    }
    blocker.reset();
  }, [blocker]);

  return (
    <div className="editor-shell">
      {contextHolder}
      <header className="editor-shell__toolbar">
        <Space wrap>
          <strong>单表单编辑器</strong>
          <Tag color={saveTag.color}>{saveTag.label}</Tag>
          <Typography.Text type="secondary">{saveSummary}</Typography.Text>
        </Space>
        <div className="editor-shell__toolbar-actions">
          <Badge status={dirty ? "processing" : "success"} />
          <Button icon={<UndoOutlined />} disabled={undoCount === 0} onClick={() => dispatch(undo())}>
            撤销
          </Button>
          <Button icon={<RedoOutlined />} disabled={redoCount === 0} onClick={() => dispatch(redo())}>
            重做
          </Button>
          <Button onClick={() => navigate("/preview")}>预览</Button>
          <Button type="primary" loading={publishing} onClick={() => void publishForm()}>
            发布
          </Button>
        </div>
      </header>

      <main className="editor-shell__content">
        <section className="editor-shell__panel">
          <ComponentPalette />
        </section>
        <section className="editor-shell__panel">
          <FormEditorWrapper />
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
