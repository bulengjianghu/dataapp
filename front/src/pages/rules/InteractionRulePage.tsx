import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  RocketOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  List,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  initializeInteractionRuleDraftState,
  resetInteractionRuleDraftState,
  setInteractionRuleCompiledRule,
  setInteractionRulePublishStatus,
  setInteractionRuleSaveStatus,
  updateInteractionRuleCompiledJson,
  updateInteractionRuleGraphJson,
  updateInteractionRuleMeta,
  type InteractionEventType,
} from "../../store/slices/interactionRuleDraftSlice";
import {
  addRuleNode,
  connectRuleNodes,
  initializeRuleGraph,
  removeRuleEdge,
  removeRuleNode,
  resetInteractionRuleGraphState,
  selectRuleNode,
  setRuleDiagnostics,
  setRuleReferences,
  updateRuleNodeData,
  type RuleGraphEdge,
  type RuleGraphNode,
  type RuleNodeType,
} from "../../store/slices/interactionRuleGraphSlice";
import { precompileInteractionRule } from "./services/interactionRuleCompiler";
import {
  createInteractionRuleOnServer,
  listInteractionRulesOnServer,
  loadInteractionRuleDraftFromServer,
  loadPublishedInteractionRuleFromServer,
  publishInteractionRuleOnServer,
  saveInteractionRuleDraftToServer,
  validateInteractionRuleOnServer,
  type InteractionRulePublishedVersion,
  type InteractionRuleSummary,
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

const NODE_TYPE_OPTIONS: Array<{ label: string; value: RuleNodeType }> = [
  { label: "触发器", value: "trigger" },
  { label: "条件", value: "condition" },
  { label: "查询", value: "query" },
  { label: "转换", value: "transform" },
  { label: "命令", value: "command" },
  { label: "上下文", value: "context" },
  { label: "通知", value: "notice" },
];

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createEdgeId() {
  return `edge_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
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
        id: String(edge.id ?? createEdgeId()),
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

function createDefaultNode(type: RuleNodeType, index: number): RuleGraphNode {
  const labelMap: Record<RuleNodeType, string> = {
    trigger: "字段触发器",
    condition: "条件分支",
    query: "数据查询",
    transform: "数据转换",
    command: "执行命令",
    context: "上下文读取",
    notice: "通知节点",
  };
  return {
    id: createNodeId(),
    type,
    position: { x: 48 + (index % 2) * 180, y: 48 + index * 96 },
    data: {
      label: labelMap[type],
      targetField: type === "trigger" ? "main.amount" : "",
      fieldKey: type === "command" ? "main.amount" : "",
      command: type === "command" ? "setValue" : "",
    },
  };
}

function RuleMetaForm() {
  const dispatch = useAppDispatch();
  const { meta, saveStatus, publishStatus, errorMessage } = useAppSelector((state) => state.interactionRuleDraft);

  return (
    <Card
      title="规则基础信息"
      size="small"
      extra={<Tag color={meta.enabled ? "green" : "default"}>{meta.enabled ? "启用" : "停用"}</Tag>}
    >
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
            onChange={(event) =>
              dispatch(updateInteractionRuleMeta({ key: "ruleName", value: event.target.value }))
            }
            placeholder="请输入规则名称"
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
            placeholder="用于补充当前规则的业务意图和范围"
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
    </Card>
  );
}

function NodePropertyPanel() {
  const dispatch = useAppDispatch();
  const graphState = useAppSelector((state) => state.interactionRuleGraph);
  const selectedNode = graphState.graph.nodes.find((item) => item.id === graphState.selectedNodeId) ?? null;

  if (!selectedNode) {
    return (
      <Card title="节点属性" size="small">
        <Empty description="请选择一个节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card title="节点属性" size="small" extra={<Tag>{selectedNode.type}</Tag>}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Typography.Text type="secondary">节点标题</Typography.Text>
          <Input
            value={String(selectedNode.data.label ?? "")}
            onChange={(event) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { label: event.target.value } }))
            }
          />
        </div>
        <div>
          <Typography.Text type="secondary">字段引用</Typography.Text>
          <Input
            value={String(selectedNode.data.fieldKey ?? "")}
            onChange={(event) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: event.target.value } }))
            }
            placeholder="例如 main.amount"
          />
        </div>
        <div>
          <Typography.Text type="secondary">触发目标</Typography.Text>
          <Input
            value={String(selectedNode.data.targetField ?? "")}
            onChange={(event) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { targetField: event.target.value } }))
            }
            placeholder="字段触发节点必填"
          />
        </div>
        <div>
          <Typography.Text type="secondary">命令/动作</Typography.Text>
          <Input
            value={String(selectedNode.data.command ?? "")}
            onChange={(event) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { command: event.target.value } }))
            }
            placeholder="例如 setValue / setReadonly"
          />
        </div>
      </Space>
    </Card>
  );
}

export function InteractionRulePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const ruleId = searchParams.get("ruleId");
  const ruleDraft = useAppSelector((state) => state.interactionRuleDraft);
  const graphState = useAppSelector((state) => state.interactionRuleGraph);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ruleList, setRuleList] = useState<InteractionRuleSummary[]>([]);
  const [validationResult, setValidationResult] = useState<InteractionRuleValidationResult | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<InteractionRulePublishedVersion | null>(null);
  const [connectTargetId, setConnectTargetId] = useState<string | null>(null);

  const selectedRuleId = ruleDraft.meta.ruleId ?? ruleId;
  const graphModel = graphState.graph;
  const selectedNode = graphState.graph.nodes.find((item) => item.id === graphState.selectedNodeId) ?? null;
  const saveSummary = useMemo(() => {
    if (ruleDraft.saveStatus === "saving") {
      return "保存中";
    }
    if (ruleDraft.publishStatus === "publishing") {
      return "发布中";
    }
    if (ruleDraft.saveStatus === "success") {
      return `草稿版本 ${ruleDraft.meta.draftVersion}`;
    }
    if (ruleDraft.publishStatus === "success" && publishedVersion) {
      return `已发布 v${publishedVersion.versionNo}`;
    }
    return ruleDraft.initialized ? "草稿未保存" : "尚未选择规则";
  }, [
    publishedVersion,
    ruleDraft.initialized,
    ruleDraft.meta.draftVersion,
    ruleDraft.publishStatus,
    ruleDraft.saveStatus,
  ]);

  useEffect(() => {
    dispatch(resetInteractionRuleDraftState());
    dispatch(resetInteractionRuleGraphState());
    return () => {
      dispatch(resetInteractionRuleDraftState());
      dispatch(resetInteractionRuleGraphState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!formId) {
      return;
    }

    let cancelled = false;
    setLoadingList(true);
    void listInteractionRulesOnServer(formId)
      .then((items) => {
        if (!cancelled) {
          setRuleList(items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          messageApi.error(error instanceof Error ? error.message : "加载规则列表失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingList(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [formId, messageApi]);

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
    });
    dispatch(setRuleDiagnostics(compiled.diagnostics));
    dispatch(setRuleReferences(compiled.references));
    dispatch(updateInteractionRuleGraphJson(graphModel));
    dispatch(updateInteractionRuleCompiledJson(compiled.compiledJson));
    dispatch(setInteractionRuleCompiledRule(compiled.compiledRule));
  }, [
    dispatch,
    graphModel,
    graphState.ruleId,
    ruleDraft.meta.eventType,
    ruleDraft.meta.priority,
    ruleDraft.meta.ruleId,
  ]);

  const handleCreateRule = async () => {
    if (!formId) {
      messageApi.error("缺少表单 ID，无法创建规则");
      return;
    }

    setCreating(true);
    try {
      const created = await createInteractionRuleOnServer(formId);
      dispatch(initializeInteractionRuleDraftState(created));
      dispatch(initializeRuleGraph({ formId, ruleId: created.meta.ruleId, graph: {} }));
      const nextRuleId = created.meta.ruleId;
      setRuleList((current) => [
        {
          ruleId: nextRuleId ?? "",
          ruleCode: created.meta.ruleCode,
          ruleName: created.meta.ruleName,
          eventType: created.meta.eventType,
          priority: created.meta.priority,
          enabled: created.meta.enabled,
          status: created.meta.status,
          updatedAt: new Date().toISOString(),
        },
        ...current.filter((item) => item.ruleId !== nextRuleId),
      ]);
      setSearchParams({ formId, ruleId: nextRuleId ?? "" });
      setPublishedVersion(null);
      setValidationResult(null);
      messageApi.success("规则草稿已创建");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建规则失败");
    } finally {
      setCreating(false);
    }
  };

  const persistDraft = async () => {
    if (!ruleDraft.initialized || !ruleDraft.meta.ruleId) {
      throw new Error("请先新建或选择一条规则");
    }
    if (!ruleDraft.meta.ruleName.trim()) {
      throw new Error("规则名称不能为空");
    }

    dispatch(setInteractionRuleSaveStatus({ status: "saving" }));
    const saved = await saveInteractionRuleDraftToServer({
      meta: ruleDraft.meta,
      graphJson: graphState.graph,
      compiledJson: ruleDraft.compiledJson,
      compiledRule: ruleDraft.compiledRule,
    });
    dispatch(initializeInteractionRuleDraftState(saved));
    dispatch(
      initializeRuleGraph({
        formId: saved.meta.formId,
        ruleId: saved.meta.ruleId,
        graph: normalizeGraphPayload(saved.graphJson),
      })
    );
    setRuleList((current) =>
      current.map((item) =>
        item.ruleId === saved.meta.ruleId
          ? {
              ...item,
              ruleCode: saved.meta.ruleCode,
              ruleName: saved.meta.ruleName,
              eventType: saved.meta.eventType,
              priority: saved.meta.priority,
              enabled: saved.meta.enabled,
              status: saved.meta.status,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    dispatch(setInteractionRuleSaveStatus({ status: "success", lastSavedAt: new Date().toISOString() }));
    return saved;
  };

  const handleSaveDraft = async () => {
    try {
      await persistDraft();
      messageApi.success("规则草稿已保存");
    } catch (error) {
      dispatch(
        setInteractionRuleSaveStatus({
          status: "error",
          errorMessage: error instanceof Error ? error.message : "规则草稿保存失败",
        })
      );
      messageApi.error(error instanceof Error ? error.message : "规则草稿保存失败");
    }
  };

  const handleValidate = async () => {
    if (!formId || !ruleDraft.meta.ruleId) {
      messageApi.error("请先选择规则");
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
      messageApi.error("请先选择规则");
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

  const addNode = (type: RuleNodeType) => {
    const nextNode = createDefaultNode(type, graphState.graph.nodes.length);
    dispatch(addRuleNode(nextNode));
  };

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(formId ? `/editor?formId=${formId}` : "/")}>
              返回表单编辑器
            </Button>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                交互规则
              </Typography.Title>
              <Typography.Text type="secondary">
                {formId ? `当前表单 ID: ${formId}` : "未指定表单"}
              </Typography.Text>
            </div>
          </Space>
          <Space>
            <Typography.Text type="secondary">{saveSummary}</Typography.Text>
            <Button icon={<PlusOutlined />} loading={creating} onClick={() => void handleCreateRule()}>
              新建规则
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              loading={ruleDraft.saveStatus === "saving"}
              onClick={() => void handleValidate()}
            >
              校验
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={ruleDraft.saveStatus === "saving"}
              onClick={() => void handleSaveDraft()}
            >
              保存草稿
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

        {!formId ? <Alert type="warning" showIcon message="请从表单编辑器进入交互规则页。" /> : null}

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr) 340px", gap: 16 }}>
          <Card
            title="规则列表"
            size="small"
            extra={<Tag color="blue">{ruleList.length} 条</Tag>}
            styles={{ body: { padding: 0, minHeight: 640 } }}
          >
            {loadingList ? (
              <div style={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : ruleList.length === 0 ? (
              <div style={{ minHeight: 640, display: "grid", placeItems: "center" }}>
                <Empty description="当前表单还没有交互规则" />
              </div>
            ) : (
              <List
                dataSource={ruleList}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      cursor: "pointer",
                      padding: 16,
                      background: item.ruleId === selectedRuleId ? "#f0f5ff" : "transparent",
                    }}
                    onClick={() => setSearchParams({ formId: formId ?? "", ruleId: item.ruleId })}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text strong>{item.ruleName || "未命名规则"}</Typography.Text>
                          <Tag color={item.enabled ? "green" : "default"}>{item.enabled ? "启用" : "停用"}</Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">{item.ruleCode}</Typography.Text>
                          <Typography.Text type="secondary">{item.eventType}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="规则画布" size="small" styles={{ body: { minHeight: 640 } }}>
            {loadingDraft ? (
              <div style={{ minHeight: 640, display: "grid", placeItems: "center" }}>
                <Spin />
              </div>
            ) : ruleDraft.initialized ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card size="small" title="节点面板">
                  <Space wrap>
                    {NODE_TYPE_OPTIONS.map((item) => (
                      <Button key={item.value} onClick={() => addNode(item.value)}>
                        {item.label}
                      </Button>
                    ))}
                  </Space>
                </Card>

                <Card size="small" title="节点画布 V1">
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {graphState.graph.nodes.length === 0 ? (
                      <Empty description="从上方节点面板拖入第一批基础节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <List
                        dataSource={graphState.graph.nodes}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              border: "1px solid #f0f0f0",
                              borderRadius: 10,
                              padding: 12,
                              background: item.id === graphState.selectedNodeId ? "#f6ffed" : "#fff",
                            }}
                            actions={[
                              <Button key="select" type="link" onClick={() => dispatch(selectRuleNode(item.id))}>
                                选择
                              </Button>,
                              <Button key="delete" type="link" danger onClick={() => dispatch(removeRuleNode(item.id))}>
                                删除
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <Tag>{item.type}</Tag>
                                  <Typography.Text strong>{String(item.data.label ?? "未命名节点")}</Typography.Text>
                                </Space>
                              }
                              description={
                                <Typography.Text type="secondary">
                                  {JSON.stringify(item.data)}
                                </Typography.Text>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    )}
                    {selectedNode && graphState.graph.nodes.length > 1 ? (
                      <Space align="center">
                        <Typography.Text type="secondary">从当前节点连到</Typography.Text>
                        <Select
                          value={connectTargetId}
                          onChange={setConnectTargetId}
                          style={{ minWidth: 200 }}
                          options={graphState.graph.nodes
                            .filter((item) => item.id !== selectedNode.id)
                            .map((item) => ({
                              label: `${item.type} / ${String(item.data.label ?? item.id)}`,
                              value: item.id,
                            }))}
                        />
                        <Button
                          onClick={() => {
                            if (!connectTargetId) {
                              return;
                            }
                            dispatch(
                              connectRuleNodes({
                                id: createEdgeId(),
                                source: selectedNode.id,
                                target: connectTargetId,
                              })
                            );
                            setConnectTargetId(null);
                          }}
                        >
                          创建连线
                        </Button>
                      </Space>
                    ) : null}
                    {graphState.graph.edges.length > 0 ? (
                      <Card size="small" title="当前连线">
                        <List
                          size="small"
                          dataSource={graphState.graph.edges}
                          renderItem={(item) => (
                            <List.Item
                              actions={[
                                <Button key="remove" type="link" danger onClick={() => dispatch(removeRuleEdge(item.id))}>
                                  删除
                                </Button>,
                              ]}
                            >
                              <Typography.Text>{`${item.source} -> ${item.target}`}</Typography.Text>
                            </List.Item>
                          )}
                        />
                      </Card>
                    ) : null}
                  </Space>
                </Card>

                <Card size="small" title="预编译诊断">
                  {graphState.diagnostics.length === 0 ? (
                    <Alert type="success" showIcon message="当前前端预编译未发现问题。" />
                  ) : (
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      {graphState.diagnostics.map((item) => (
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

                {validationResult ? (
                  <Card size="small" title="服务端校验结果">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Alert
                        type={validationResult.valid ? "success" : "warning"}
                        showIcon
                        message={validationResult.valid ? "服务端校验通过" : "服务端校验未通过"}
                      />
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          background: "#fafafa",
                          borderRadius: 8,
                          overflowX: "auto",
                        }}
                      >
                        {JSON.stringify(validationResult, null, 2)}
                      </pre>
                    </Space>
                  </Card>
                ) : null}

                {publishedVersion ? (
                  <Card size="small" title={`已发布版本 v${publishedVersion.versionNo}`}>
                    <Typography.Paragraph type="secondary">
                      发布时间：{publishedVersion.publishedAt || "未知"}
                    </Typography.Paragraph>
                    <pre
                      style={{
                        margin: 0,
                        padding: 12,
                        background: "#fafafa",
                        borderRadius: 8,
                        overflowX: "auto",
                      }}
                    >
                      {JSON.stringify(publishedVersion.publishedSnapshotJson, null, 2)}
                    </pre>
                  </Card>
                ) : null}
              </Space>
            ) : (
              <div style={{ minHeight: 640, display: "grid", placeItems: "center" }}>
                <Empty description="请选择一条规则，或先新建规则草稿" />
              </div>
            )}
          </Card>

          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <RuleMetaForm />
            <NodePropertyPanel />
            <Card title="引用摘要" size="small">
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: "#fafafa",
                  borderRadius: 8,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(graphState.references, null, 2)}
              </pre>
            </Card>
            <Card title="当前编译结果" size="small">
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: "#fafafa",
                  borderRadius: 8,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(ruleDraft.compiledJson, null, 2)}
              </pre>
            </Card>
          </Space>
        </div>
      </Space>
    </div>
  );
}
