import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  deserializeCompiledInteractionRule,
  initializeInteractionRuleDraftState,
  resetInteractionRuleDraftState,
  serializeCompiledInteractionRule,
  setInteractionRuleCompiledRule,
  setInteractionRulePublishStatus,
  setInteractionRuleSaveStatus,
  updateInteractionRuleGraphJson,
  updateInteractionRuleMeta,
  type InteractionEventType,
  type InteractionRuleMeta,
} from "../../store/slices/interactionRuleDraftSlice";
import {
  addRuleNode,
  initializeRuleGraph,
  markRuleGraphDirty,
  moveRuleNode,
  resetInteractionRuleGraphState,
  setRuleDiagnostics,
  setRuleReferences,
  type InteractionRuleGraphState,
  type RuleGraphEdge,
  type RuleGraphDiagnostic,
  type RuleGraphNode,
  type RuleNodeType,
  type RuleReferenceSummary,
} from "../../store/slices/interactionRuleGraphSlice";
import { RuleEdgePropertyPanel } from "./components/RuleEdgePropertyPanel";
import { RuleGraphCanvas } from "./components/RuleGraphCanvas";
import { RuleNodePropertyPanel } from "./components/RuleNodePropertyPanel";
import { RulePalette } from "./components/RulePalette";
import { precompileInteractionRule } from "./services/interactionRuleCompiler";
import { loadInteractionRuleFieldOptions } from "./services/interactionRuleFormFields";
import { layoutInteractionRuleGraph } from "./services/interactionRuleLayout";
import {
  loadInteractionRuleDraftFromServer,
  loadPublishedInteractionRuleFromServer,
  publishInteractionRuleOnServer,
  saveInteractionRuleDraftToServer,
  validateInteractionRuleOnServer,
  type InteractionRulePublishedVersion,
  type InteractionRuleValidationResult,
} from "./services/interactionRules";

const EVENT_TYPE_OPTIONS: { label: string; value: InteractionEventType }[] = [
  { label: "主表字段变化", value: "FIELD_CHANGE_MAIN" },
  { label: "明细字段变化", value: "FIELD_CHANGE_DETAIL" },
  { label: "明细行新增", value: "DETAIL_ROW_ADDED" },
  { label: "明细行删除", value: "DETAIL_ROW_REMOVED" },
  { label: "关联选择打开", value: "RELATION_OPEN" },
  { label: "关联选择确认", value: "RELATION_SELECTED" },
  { label: "表单初始化", value: "FORM_INIT" },
  { label: "提交前校验", value: "FORM_SUBMIT_BEFORE" },
];

const NODE_PALETTE_ITEMS: Array<{
  type: RuleNodeType;
  label: string;
  description: string;
  accent: string;
}> = [
  { type: "trigger", label: "触发器", description: "规则起点，描述事件来源和触发目标。", accent: "#1677ff" },
  { type: "condition", label: "条件", description: "根据表达式决定 true / false 分支。", accent: "#faad14" },
  { type: "query", label: "查询", description: "读取当前表单、上下文或外部数据。", accent: "#13c2c2" },
  { type: "transform", label: "转换", description: "做字段映射、过滤、聚合、计算。", accent: "#52c41a" },
  { type: "command", label: "命令", description: "向运行时发出 setValue / setReadonly 等命令。", accent: "#722ed1" },
  { type: "notice", label: "通知", description: "给用户提示或写入调试日志。", accent: "#eb2f96" },
  { type: "end", label: "结束", description: "显式收束流程，便于表达闭环。", accent: "#2f54eb" },
];

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

function formatSavedTime(timestamp: string | null) {
  if (!timestamp) {
    return "已保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function createRuleDraftFingerprint(
  meta: InteractionRuleMeta,
  graphJson: Record<string, unknown>,
  compiledRule: ReturnType<typeof deserializeCompiledInteractionRule> | null
) {
  return JSON.stringify({
    meta: {
      ruleName: meta.ruleName,
      eventType: meta.eventType,
      scopeType: meta.scopeType,
      priority: meta.priority,
      description: meta.description,
      enabled: meta.enabled,
      compilerVersion: meta.compilerVersion,
    },
    graphJson,
    compiledJson: serializeCompiledInteractionRule(compiledRule),
  });
}

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeGraphPayload(payload: Record<string, unknown> | undefined) {
  const rawNodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const rawEdges = Array.isArray(payload?.edges) ? payload.edges : [];
  const rawViewport = payload?.viewport;
  return {
    nodes: rawNodes as RuleGraphNode[],
    edges: rawEdges.map((item) => {
      const edge = item as Record<string, unknown>;
      return {
        id: String(edge.id ?? `edge_${Date.now()}`),
        source: String(edge.source ?? ""),
        target: String(edge.target ?? ""),
        branch:
          edge.branch === "success" ||
          edge.branch === "failure" ||
          edge.branch === "true" ||
          edge.branch === "false" ||
          edge.branch === "empty" ||
          edge.branch === "nonEmpty"
            ? edge.branch
            : undefined,
      } satisfies RuleGraphEdge;
    }),
    viewport:
      rawViewport && typeof rawViewport === "object"
        ? (rawViewport as { x: number; y: number; zoom: number })
        : { x: 0, y: 0, zoom: 1 },
  };
}

function createDefaultNode(type: RuleNodeType, position: { x: number; y: number }): RuleGraphNode {
  const labels: Record<RuleNodeType, string> = {
    trigger: "字段触发器",
    condition: "条件判断",
    query: "数据查询",
    transform: "数据转换",
    command: "执行命令",
    notice: "用户提示",
    end: "结束节点",
  };
  return {
    id: createNodeId(),
    type,
    position,
    data: {
      label: labels[type],
      description: "",
      targetField: "",
      fieldKey: "",
      command: type === "command" ? "setValue" : "",
      branch: "success",
    },
  };
}

function RuleMetaPanel() {
  const dispatch = useAppDispatch();
  const { meta, saveStatus, publishStatus, errorMessage } = useAppSelector((state) => state.interactionRuleDraft);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {(saveStatus === "error" || publishStatus === "error") && errorMessage ? (
        <Alert type="error" message={errorMessage} showIcon />
      ) : null}
      <div>
        <Typography.Text type="secondary">规则编码</Typography.Text>
        <Input value={meta.ruleCode} disabled />
      </div>
      <div>
        <Typography.Text type="secondary">规则名称</Typography.Text>
        <Input
          value={meta.ruleName}
          onChange={(event) => dispatch(updateInteractionRuleMeta({ key: "ruleName", value: event.target.value }))}
        />
      </div>
      <div>
        <Typography.Text type="secondary">触发事件</Typography.Text>
        <Select
          value={meta.eventType}
          options={EVENT_TYPE_OPTIONS}
          onChange={(value) => dispatch(updateInteractionRuleMeta({ key: "eventType", value }))}
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <Typography.Text type="secondary">优先级</Typography.Text>
        <InputNumber
          min={1}
          max={9999}
          value={meta.priority}
          onChange={(value) => dispatch(updateInteractionRuleMeta({ key: "priority", value: value ?? 100 }))}
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <Typography.Text type="secondary">规则说明</Typography.Text>
        <Input.TextArea
          rows={4}
          value={meta.description}
          onChange={(event) =>
            dispatch(updateInteractionRuleMeta({ key: "description", value: event.target.value }))
          }
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography.Text type="secondary">启用状态</Typography.Text>
        <Switch
          checked={meta.enabled}
          onChange={(checked) => dispatch(updateInteractionRuleMeta({ key: "enabled", value: checked }))}
        />
      </div>
    </Space>
  );
}

function RuleCompilePanel(props: {
  diagnostics: RuleGraphDiagnostic[];
  compiledJson: Record<string, unknown>;
  validationResult: InteractionRuleValidationResult | null;
  publishedVersion: InteractionRulePublishedVersion | null;
}) {
  const errorCount = props.diagnostics.filter((item) => item.level === "error").length;
  const warningCount = props.diagnostics.filter((item) => item.level === "warning").length;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="预编译诊断"
        size="small"
        extra={
          <Space size={8}>
            <Tag color={errorCount > 0 ? "error" : "default"}>{`${errorCount} 错误`}</Tag>
            <Tag color={warningCount > 0 ? "warning" : "default"}>{`${warningCount} 警告`}</Tag>
          </Space>
        }
      >
        {props.diagnostics.length === 0 ? (
          <Alert type="success" showIcon message="当前前端预编译未发现问题。" />
        ) : (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {props.diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.level === "error" ? "error" : "warning"}
                showIcon
                message={item.message}
                description={item.code}
              />
            ))}
          </Space>
        )}
      </Card>

      <Card title="当前编译结果" size="small">
        {props.compiledJson && Object.keys(props.compiledJson).length > 0 ? (
          <pre className="rule-diagnostics__json">{JSON.stringify(props.compiledJson, null, 2)}</pre>
        ) : (
          <Empty description="当前还没有可发布的编译结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {props.validationResult ? (
        <Card title="服务端校验结果" size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Alert
              type={props.validationResult.valid ? "success" : "warning"}
              showIcon
              message={props.validationResult.valid ? "服务端校验通过" : "服务端校验未通过"}
            />
            <pre className="rule-diagnostics__json">{JSON.stringify(props.validationResult, null, 2)}</pre>
          </Space>
        </Card>
      ) : null}

      {props.publishedVersion ? (
        <Card title="已发布版本" size="small" extra={<Tag color="green">{`v${props.publishedVersion.versionNo}`}</Tag>}>
          <Typography.Paragraph type="secondary">
            发布时间：{props.publishedVersion.publishedAt || "未知"}
          </Typography.Paragraph>
          <pre className="rule-diagnostics__json">
            {JSON.stringify(props.publishedVersion.publishedSnapshotJson, null, 2)}
          </pre>
        </Card>
      ) : null}
    </Space>
  );
}

function RuleReferencePanel(props: {
  references: RuleReferenceSummary;
  publishedVersion: InteractionRulePublishedVersion | null;
}) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title="引用摘要" size="small">
        <pre className="rule-diagnostics__json">{JSON.stringify(props.references, null, 2)}</pre>
      </Card>
      {props.publishedVersion ? (
        <Card title="发布版依赖" size="small">
          <pre className="rule-diagnostics__json">
            {JSON.stringify(props.publishedVersion.dependencyJson, null, 2)}
          </pre>
        </Card>
      ) : null}
    </Space>
  );
}

export function InteractionRulePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const ruleId = searchParams.get("ruleId");
  const ruleDraft = useAppSelector((state) => state.interactionRuleDraft);
  const graphState = useAppSelector((state) => state.interactionRuleGraph);
  const graphModel = graphState.graph;
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [validationResult, setValidationResult] = useState<InteractionRuleValidationResult | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<InteractionRulePublishedVersion | null>(null);
  const [persistedFingerprint, setPersistedFingerprint] = useState<string | null>(null);
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [availableFieldKeys, setAvailableFieldKeys] = useState<string[]>([]);
  const hasCanvasErrors = graphState.diagnostics.some((item) => item.level === "error");
  const ruleDisplayName = ruleDraft.meta.ruleName || "未命名规则";
  const currentFingerprint = useMemo(
    () => createRuleDraftFingerprint(ruleDraft.meta, graphModel, ruleDraft.compiledRule),
    [graphModel, ruleDraft.compiledRule, ruleDraft.meta]
  );
  const dirty = Boolean(ruleDraft.initialized && persistedFingerprint && currentFingerprint !== persistedFingerprint);
  const hasSavedDraft = Boolean(ruleDraft.meta.ruleId);
  const saveSummary = useMemo(() => {
    if (ruleDraft.publishStatus === "publishing") {
      return "发布中";
    }
    if (ruleDraft.saveStatus === "saving") {
      return autoSavePending ? "自动保存中" : "保存中";
    }
    if (dirty) {
      return autoSavePending ? "等待自动保存" : "未保存";
    }
    if (!hasSavedDraft) {
      return "尚未保存草稿";
    }
    return `已保存 ${formatSavedTime(ruleDraft.lastSavedAt)}`;
  }, [autoSavePending, dirty, hasSavedDraft, ruleDraft.lastSavedAt, ruleDraft.publishStatus, ruleDraft.saveStatus]);
  const saveTag = useMemo(() => getSaveTag(dirty, hasSavedDraft), [dirty, hasSavedDraft]);
  const latestDraftRef = useRef({
    initialized: ruleDraft.initialized,
    meta: ruleDraft.meta,
    graphModel,
    compiledRule: ruleDraft.compiledRule,
    selectedNodeId: graphState.selectedNodeId,
    selectedEdgeId: graphState.selectedEdgeId,
  });

  useEffect(() => {
    latestDraftRef.current = {
      initialized: ruleDraft.initialized,
      meta: ruleDraft.meta,
      graphModel,
      compiledRule: ruleDraft.compiledRule,
      selectedNodeId: graphState.selectedNodeId,
      selectedEdgeId: graphState.selectedEdgeId,
    };
  }, [
    graphModel,
    graphState.selectedEdgeId,
    graphState.selectedNodeId,
    ruleDraft.compiledRule,
    ruleDraft.initialized,
    ruleDraft.meta,
  ]);

  useEffect(() => {
    dispatch(resetInteractionRuleDraftState());
    dispatch(resetInteractionRuleGraphState());
    setPersistedFingerprint(null);
    setAutoSavePending(false);
    return () => {
      dispatch(resetInteractionRuleDraftState());
      dispatch(resetInteractionRuleGraphState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!formId || !ruleId) {
      dispatch(resetInteractionRuleDraftState());
      dispatch(resetInteractionRuleGraphState());
      setValidationResult(null);
      setPublishedVersion(null);
      return;
    }

    let cancelled = false;
    setLoadingDraft(true);
    void Promise.all([
      loadInteractionRuleDraftFromServer(formId, ruleId),
      loadPublishedInteractionRuleFromServer(formId, ruleId).catch(() => null),
    ])
      .then(([draft, published]) => {
        if (cancelled) {
          return;
        }
        dispatch(initializeInteractionRuleDraftState(draft));
        dispatch(
          initializeRuleGraph({
            formId,
            ruleId,
            graph: normalizeGraphPayload(draft.graphJson),
          })
        );
        setPersistedFingerprint(createRuleDraftFingerprint(draft.meta, draft.graphJson, draft.compiledRule ?? null));
        dispatch(setInteractionRuleSaveStatus({ status: "success", lastSavedAt: new Date().toISOString() }));
        setPublishedVersion(published);
      })
      .catch((error) => {
        if (!cancelled) {
          messageApi.error(error instanceof Error ? error.message : "加载规则草稿失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDraft(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, formId, messageApi, ruleId]);

  useEffect(() => {
    if (!formId) {
      setAvailableFieldKeys([]);
      return;
    }

    let cancelled = false;
    void loadInteractionRuleFieldOptions(formId)
      .then((options) => {
        if (!cancelled) {
          setAvailableFieldKeys(options.map((item) => item.value));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableFieldKeys([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  useEffect(() => {
    if (!ruleDraft.meta.ruleId || !graphState.ruleId) {
      return;
    }
    const compiled = precompileInteractionRule({
      ruleId: ruleDraft.meta.ruleId,
      eventType: ruleDraft.meta.eventType,
      priority: ruleDraft.meta.priority,
      graphState: {
        ...graphState,
        graph: graphModel,
      },
      availableFieldKeys,
    });
    dispatch(setRuleDiagnostics(compiled.diagnostics));
    dispatch(setRuleReferences(compiled.references));
    dispatch(updateInteractionRuleGraphJson(graphModel));
    dispatch(setInteractionRuleCompiledRule(compiled.compiledRule));
  }, [
    dispatch,
    graphModel,
    graphState.ruleId,
    ruleDraft.meta.eventType,
    ruleDraft.meta.priority,
    ruleDraft.meta.ruleId,
    availableFieldKeys,
  ]);

  const persistDraft = async () => {
    const latestDraft = latestDraftRef.current;
    if (!latestDraft.initialized || !latestDraft.meta.ruleId) {
      throw new Error("规则尚未初始化");
    }
    if (!latestDraft.meta.ruleName.trim()) {
      throw new Error("规则名称不能为空");
    }

    dispatch(setInteractionRuleSaveStatus({ status: "saving" }));
    const saved = await saveInteractionRuleDraftToServer({
      meta: latestDraft.meta,
      graphJson: latestDraft.graphModel,
      compiledRule: latestDraft.compiledRule,
    });
    dispatch(initializeInteractionRuleDraftState(saved));
    dispatch(
      initializeRuleGraph({
        formId: saved.meta.formId,
        ruleId: saved.meta.ruleId,
        graph: normalizeGraphPayload(saved.graphJson),
        selectedNodeId: latestDraft.selectedNodeId,
        selectedEdgeId: latestDraft.selectedEdgeId,
      })
    );
    const savedAt = new Date().toISOString();
    setPersistedFingerprint(createRuleDraftFingerprint(saved.meta, saved.graphJson, saved.compiledRule ?? null));
    dispatch(setInteractionRuleSaveStatus({ status: "success", lastSavedAt: savedAt }));
    setAutoSavePending(false);
    return saved;
  };

  useEffect(() => {
    if (loadingDraft || !dirty || ruleDraft.saveStatus === "saving" || ruleDraft.publishStatus === "publishing") {
      setAutoSavePending(false);
      return;
    }

    setAutoSavePending(true);
    const timer = window.setTimeout(() => {
      void persistDraft().catch((error) => {
        dispatch(
          setInteractionRuleSaveStatus({
            status: "error",
            errorMessage: error instanceof Error ? error.message : "规则草稿保存失败",
          })
        );
        messageApi.error(error instanceof Error ? error.message : "规则草稿保存失败");
      });
    }, AUTO_SAVE_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dirty, dispatch, loadingDraft, messageApi, ruleDraft.publishStatus, ruleDraft.saveStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !dirty || !latestDraftRef.current.meta.ruleId) {
        return;
      }
      void saveInteractionRuleDraftToServer(
        {
          meta: latestDraftRef.current.meta,
          graphJson: latestDraftRef.current.graphModel,
          compiledRule: latestDraftRef.current.compiledRule,
        },
        { keepalive: true }
      )
        .then((saved) => {
          const savedAt = new Date().toISOString();
          setPersistedFingerprint(createRuleDraftFingerprint(saved.meta, saved.graphJson, saved.compiledRule ?? null));
          dispatch(initializeInteractionRuleDraftState(saved));
          dispatch(
            initializeRuleGraph({
              formId: saved.meta.formId,
              ruleId: saved.meta.ruleId,
              graph: normalizeGraphPayload(saved.graphJson),
              selectedNodeId: latestDraftRef.current.selectedNodeId,
              selectedEdgeId: latestDraftRef.current.selectedEdgeId,
            })
          );
          dispatch(setInteractionRuleSaveStatus({ status: "success", lastSavedAt: savedAt }));
          setAutoSavePending(false);
        })
        .catch(() => {
          // 页面隐藏时静默失败，避免打断用户离开流程
        });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dirty, dispatch]);

  const handleValidate = async () => {
    if (!formId || !ruleDraft.meta.ruleId) {
      messageApi.error("规则尚未初始化");
      return;
    }
    try {
      await persistDraft();
      const result = await validateInteractionRuleOnServer(formId, ruleDraft.meta.ruleId);
      setValidationResult(result);
      messageApi[result.valid ? "success" : "warning"](result.valid ? "校验通过" : "校验未通过");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "规则校验失败");
    }
  };

  const handlePublish = async () => {
    if (!formId || !ruleDraft.meta.ruleId) {
      messageApi.error("规则尚未初始化");
      return;
    }
    dispatch(setInteractionRulePublishStatus({ status: "publishing" }));
    try {
      await persistDraft();
      const result = await validateInteractionRuleOnServer(formId, ruleDraft.meta.ruleId);
      setValidationResult(result);
      if (!result.valid) {
        dispatch(setInteractionRulePublishStatus({ status: "error", errorMessage: "规则校验未通过，已阻断发布" }));
        messageApi.warning("规则校验未通过，已阻断发布");
        return;
      }
      await publishInteractionRuleOnServer(formId, ruleDraft.meta.ruleId);
      const published = await loadPublishedInteractionRuleFromServer(formId, ruleDraft.meta.ruleId);
      setPublishedVersion(published);
      dispatch(setInteractionRulePublishStatus({ status: "success" }));
      messageApi.success("规则已发布");
    } catch (error) {
      dispatch(
        setInteractionRulePublishStatus({
          status: "error",
          errorMessage: error instanceof Error ? error.message : "规则发布失败",
        })
      );
      messageApi.error(error instanceof Error ? error.message : "规则发布失败");
    }
  };

  const handleAddNode = (type: RuleNodeType, position?: { x: number; y: number }) => {
    const nextNode = createDefaultNode(type, position ?? { x: 120, y: 120 + graphModel.nodes.length * 48 });
    dispatch(addRuleNode(nextNode));
    dispatch(markRuleGraphDirty(true));
  };

  const handleAutoLayout = async () => {
    const nextNodes = await layoutInteractionRuleGraph({
      nodes: graphModel.nodes,
      edges: graphModel.edges,
    });
    nextNodes.forEach((node) => {
      dispatch(moveRuleNode({ nodeId: node.id, position: node.position }));
    });
    dispatch(markRuleGraphDirty(true));
  };

  if (!formId || !ruleId) {
    return (
      <div className="interaction-rule-page">
        {contextHolder}
        <div className="interaction-rule-page__empty">
          <Empty description="请从表单编辑页的交互规则列表进入单条规则编辑页" />
        </div>
      </div>
    );
  }

  return (
    <div className="interaction-rule-page interaction-rule-page--standalone">
      {contextHolder}
      {loadingDraft ? (
        <div className="interaction-rule-page__empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="interaction-rule-page__header">
            <Space className="interaction-rule-page__header-main">
              <Button
                aria-label="返回表单编辑"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(formId ? `/editor?formId=${formId}` : "/editor")}
              />
              <Typography.Title level={4} style={{ margin: 0 }}>
                {ruleDisplayName}
              </Typography.Title>
            </Space>
            <Space className="interaction-rule-page__header-actions">
              <Badge status={dirty ? "processing" : "success"} />
              <Typography.Text type="secondary">{saveSummary}</Typography.Text>
              <Tag color={saveTag.color}>{saveTag.label}</Tag>
              {hasCanvasErrors ? (
                <Alert type="warning" showIcon message="当前画布存在未完成配置，发布前请先修复。" />
              ) : null}
              <Button icon={<CheckCircleOutlined />} onClick={() => void handleValidate()}>
                校验
              </Button>
              <Button
                type="primary"
                ghost
                icon={<RocketOutlined />}
                loading={ruleDraft.publishStatus === "publishing"}
                onClick={() => void handlePublish()}
              >
                发布
              </Button>
            </Space>
          </div>

          <div className="interaction-rule-page__layout interaction-rule-page__layout--editor">
          <div className="interaction-rule-page__column">
            <RulePalette items={NODE_PALETTE_ITEMS} onAdd={(type) => handleAddNode(type)} />
          </div>

          <div className="interaction-rule-page__center">
            <Card
              title={
                <Space size={8}>
                  <span>规则画布</span>
                  <Tooltip title="自动布局">
                    <Button
                      aria-label="自动布局"
                      size="small"
                      icon={<ApartmentOutlined />}
                      onClick={() => void handleAutoLayout()}
                    />
                  </Tooltip>
                </Space>
              }
              size="small"
              styles={{ body: { padding: 0, minHeight: 720 } }}
            >
              <RuleGraphCanvas
                graphState={graphState}
                dispatch={dispatch}
                onDropNode={(type, position) => handleAddNode(type, position)}
                onAutoLayout={() => void handleAutoLayout()}
              />
            </Card>
          </div>

          <div className="interaction-rule-page__column">
              <Card
                size="small"
                className="interaction-rule-page__inspector"
                styles={{ body: { padding: 0, minHeight: 0 } }}
              >
                <Tabs
                  className="interaction-rule-page__tabs"
                  items={[
                    {
                      key: "property",
                      label: "属性面板",
                      children: (
                        <div className="interaction-rule-page__tab-pane">
                          {graphState.selectedEdgeId ? (
                            <RuleEdgePropertyPanel graphState={graphState} embedded />
                          ) : graphState.selectedNodeId ? (
                            <RuleNodePropertyPanel graphState={graphState} embedded />
                          ) : (
                            <RuleMetaPanel />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "compile",
                      label: "编译信息",
                      children: (
                        <div className="interaction-rule-page__tab-pane">
                          <RuleCompilePanel
                            diagnostics={graphState.diagnostics}
                            compiledJson={serializeCompiledInteractionRule(ruleDraft.compiledRule)}
                            validationResult={validationResult}
                            publishedVersion={publishedVersion}
                          />
                        </div>
                      ),
                    },
                    {
                      key: "reference",
                      label: "引用信息",
                      children: (
                        <div className="interaction-rule-page__tab-pane">
                          <RuleReferencePanel
                            references={graphState.references}
                            publishedVersion={publishedVersion}
                          />
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
