import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Badge, Button, Modal, Popconfirm, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectDirty,
  selectFormId,
  selectNodesById,
  selectHistoryFutureCount,
  selectHistoryPastCount,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { redo, undo } from "../../../store/slices/editorHistorySlice";
import { markDirty, resetSchemaState, selectNode, setFormId, setNodesById } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID } from "../../../types/schema/node";
import { ComponentPalette } from "./leftPanel/ComponentPalette";
import { EditorDndContextProvider } from "./formDesign/editor/EditorDndContext";
import { FormEditorWrapper } from "./formDesign/editor/FormEditorWrapper";
import { FormPreviewRenderer } from "./formDesign/runtime/FormPreviewRenderer";
import { PropertyPanel } from "./propertyPanel/PropertyPanel";
import {
  createFormOnServer,
  loadDraftFromServer,
  publishFormToServer,
  saveDraftToServer,
  validateBeforePublish,
} from "../services/formPersistence";
import {
  createInteractionRuleOnServer,
  deleteInteractionRuleOnServer,
  listInteractionRulesOnServer,
  type InteractionRuleSummary,
} from "../../rules/services/interactionRules";

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
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const dirty = useAppSelector(selectDirty);
  const formId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const undoCount = useAppSelector(selectHistoryPastCount);
  const redoCount = useAppSelector(selectHistoryFutureCount);
  const draftFormId = searchParams.get("formId");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ruleListOpen, setRuleListOpen] = useState(false);
  const [loadingRuleList, setLoadingRuleList] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleList, setRuleList] = useState<InteractionRuleSummary[]>([]);
  const hasSavedDraft = Boolean(formId) || lastSavedAt !== null;
  const latestStateRef = useRef({
    dirty,
    formId,
    nodesById,
    selectedNodeKey,
  });

  useEffect(() => {
    latestStateRef.current = {
      dirty,
      formId,
      nodesById,
      selectedNodeKey,
    };
  }, [dirty, formId, nodesById, selectedNodeKey]);

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
  const formTitle = useMemo(() => {
    const rawTitle = nodesById[PAGE_NODE_ID]?.props?.title;
    return typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : "未命名表单";
  }, [nodesById]);

  const commitSavedState = (
    result: { formId: string; nodesById: typeof nodesById },
    options?: { preserveSelection?: boolean }
  ) => {
    dispatch(setFormId(result.formId));
    dispatch(setNodesById(result.nodesById));
    const nextSelectedNodeKey =
      options?.preserveSelection && latestStateRef.current.selectedNodeKey
        ? result.nodesById[latestStateRef.current.selectedNodeKey]
          ? latestStateRef.current.selectedNodeKey
          : PAGE_NODE_ID
        : PAGE_NODE_ID;
    dispatch(selectNode(nextSelectedNodeKey));
    dispatch(markDirty(false));
    setLastSavedAt(Date.now());
  };

  const saveDraft = async (options?: { keepalive?: boolean }) => {
    if (saving || publishing || !formId) {
      return null;
    }

    setSaving(true);

    try {
      const result = await saveDraftToServer({
        formId,
        nodesById,
        keepalive: options?.keepalive,
      });
      commitSavedState(result, { preserveSelection: true });
      return result;
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存草稿失败");
      return null;
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
      if (!formId) {
        throw new Error("表单初始化中，请稍后再试");
      }
      const saved = await saveDraftToServer({ formId, nodesById });
      commitSavedState(saved, { preserveSelection: true });
      await publishFormToServer({ formId: saved.formId });
      messageApi.success("表单已发布");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    if (initializing || !dirty || saving || publishing) {
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
  }, [dirty, formId, initializing, nodesById, publishing, saving]);

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
    let cancelled = false;
    setInitializing(true);
    const initialize = async () => {
      dispatch(resetSchemaState());

      if (draftFormId) {
        const result = await loadDraftFromServer(draftFormId);
        if (!cancelled) {
          commitSavedState(result);
        }
        return;
      }

      const createdFormId = await createFormOnServer();
      if (!cancelled) {
        dispatch(setFormId(createdFormId));
        dispatch(selectNode(PAGE_NODE_ID));
        setLastSavedAt(Date.now());
      }
    };

    void initialize()
      .catch((error) => {
        if (cancelled) {
          return;
        }
        messageApi.error(error instanceof Error ? error.message : "加载草稿失败");
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, draftFormId, messageApi]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !latestStateRef.current.dirty || !latestStateRef.current.formId) {
        return;
      }
      void saveDraft({ keepalive: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadRuleList = async (targetFormId: string) => {
    setLoadingRuleList(true);
    try {
      const items = await listInteractionRulesOnServer(targetFormId);
      setRuleList(items);
      return items;
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载交互规则列表失败");
      return [];
    } finally {
      setLoadingRuleList(false);
    }
  };

  const openRuleList = async () => {
    if (!formId) {
      messageApi.error("请先保存表单草稿后再配置交互规则");
      return;
    }
    setRuleListOpen(true);
    await loadRuleList(formId);
  };

  const handleCreateRule = async () => {
    if (!formId) {
      messageApi.error("请先保存表单草稿后再配置交互规则");
      return;
    }
    setCreatingRule(true);
    try {
      const created = await createInteractionRuleOnServer(formId);
      setRuleListOpen(false);
      navigate(`/editor/rules?formId=${formId}&ruleId=${created.meta.ruleId}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建交互规则失败");
    } finally {
      setCreatingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!formId) {
      messageApi.error("表单尚未初始化");
      return;
    }
    try {
      await deleteInteractionRuleOnServer(formId, ruleId);
      messageApi.success("规则已删除");
      await loadRuleList(formId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除交互规则失败");
    }
  };

  return (
    <div className="editor-shell">
      {contextHolder}
      <header className="editor-shell__toolbar">
        <div className="editor-shell__toolbar-title">
          <Space wrap>
            <Button aria-label="返回列表" icon={<ArrowLeftOutlined />} onClick={() => navigate("/")} />
            <strong>{formTitle}</strong>
          </Space>
        </div>
        <div className="editor-shell__toolbar-actions">
          <Badge status={dirty ? "processing" : "success"} />
          <Typography.Text type="secondary">{saveSummary}</Typography.Text>
          <Tag color={saveTag.color}>{saveTag.label}</Tag>
          <Button disabled={initializing || !formId} onClick={() => void openRuleList()}>
            交互规则
          </Button>
          <Button disabled={initializing} onClick={() => setPreviewOpen(true)}>
            预览
          </Button>
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
          <FormEditorWrapper
            undoDisabled={undoCount === 0}
            redoDisabled={redoCount === 0}
            onUndo={() => dispatch(undo())}
            onRedo={() => dispatch(redo())}
          />
        </section>
        <section className="editor-shell__panel">
          <PropertyPanel />
        </section>
      </main>

      <Modal
        title="交互规则"
        open={ruleListOpen}
        onCancel={() => setRuleListOpen(false)}
        width={720}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setRuleListOpen(false)}>关闭</Button>
            <Button type="primary" icon={<PlusOutlined />} loading={creatingRule} onClick={() => void handleCreateRule()}>
              新增规则
            </Button>
          </Space>
        }
      >
        {loadingRuleList ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <div className="editor-rule-list">
            <Table<InteractionRuleSummary>
              className="editor-rule-table"
              rowKey="ruleId"
              size="small"
              pagination={false}
              dataSource={ruleList}
              locale={{ emptyText: "当前表单还没有交互规则" }}
              columns={[
                {
                  title: "规则名称",
                  dataIndex: "ruleName",
                  key: "ruleName",
                  ellipsis: true,
                  render: (_, item) => (
                    <Space size={8} wrap>
                      <Typography.Text strong>{item.ruleName || "未命名规则"}</Typography.Text>
                      <Tag color={item.enabled ? "green" : "default"}>{item.enabled ? "启用" : "停用"}</Tag>
                    </Space>
                  ),
                },
                {
                  title: "规则编码",
                  dataIndex: "ruleCode",
                  key: "ruleCode",
                  width: 160,
                  ellipsis: true,
                  render: (value: string) => <Typography.Text type="secondary">{value}</Typography.Text>,
                },
                {
                  title: "事件",
                  dataIndex: "eventType",
                  key: "eventType",
                  width: 150,
                  ellipsis: true,
                  render: (value: string) => <Typography.Text type="secondary">{value}</Typography.Text>,
                },
                {
                  title: "操作",
                  key: "actions",
                  width: 110,
                  align: "center",
                  render: (_, item) => (
                    <Space size={4}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        aria-label={`编辑规则 ${item.ruleName || item.ruleCode}`}
                        onClick={() => {
                          setRuleListOpen(false);
                          navigate(`/editor/rules?formId=${formId}&ruleId=${item.ruleId}`);
                        }}
                      />
                      <Popconfirm
                        title="确认删除？"
                        description="删除后不可恢复"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => void handleDeleteRule(item.ruleId)}
                      >
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label={`删除规则 ${item.ruleName || item.ruleCode}`}
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="填报预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <FormPreviewRenderer />
      </Modal>
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
