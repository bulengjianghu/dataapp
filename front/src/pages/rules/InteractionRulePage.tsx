import {
  ArrowLeftOutlined,
  PlusOutlined,
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
  setInteractionRuleSaveStatus,
  updateInteractionRuleMeta,
  type InteractionEventType,
} from "../../store/slices/interactionRuleDraftSlice";
import {
  createInteractionRuleOnServer,
  listInteractionRulesOnServer,
  loadInteractionRuleDraftFromServer,
  saveInteractionRuleDraftToServer,
  type InteractionRuleSummary,
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

function RuleMetaForm() {
  const dispatch = useAppDispatch();
  const { meta, saveStatus, errorMessage } = useAppSelector((state) => state.interactionRuleDraft);

  return (
    <Card
      title="规则基础信息"
      size="small"
      extra={<Tag color={meta.enabled ? "green" : "default"}>{meta.enabled ? "启用" : "停用"}</Tag>}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {saveStatus === "error" && errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}
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

export function InteractionRulePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const ruleId = searchParams.get("ruleId");
  const ruleDraft = useAppSelector((state) => state.interactionRuleDraft);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ruleList, setRuleList] = useState<InteractionRuleSummary[]>([]);

  const selectedRuleId = ruleDraft.meta.ruleId ?? ruleId;
  const saveSummary = useMemo(() => {
    if (ruleDraft.saveStatus === "saving") {
      return "保存中";
    }
    if (ruleDraft.saveStatus === "success") {
      return `草稿版本 ${ruleDraft.meta.draftVersion}`;
    }
    if (ruleDraft.saveStatus === "error") {
      return "保存失败";
    }
    return ruleDraft.initialized ? "草稿未保存" : "尚未选择规则";
  }, [ruleDraft.initialized, ruleDraft.meta.draftVersion, ruleDraft.saveStatus]);

  useEffect(() => {
    dispatch(resetInteractionRuleDraftState());
    return () => {
      dispatch(resetInteractionRuleDraftState());
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
      return;
    }

    let cancelled = false;
    setLoadingDraft(true);
    void loadInteractionRuleDraftFromServer(formId, ruleId)
      .then((draft) => {
        if (!cancelled) {
          dispatch(initializeInteractionRuleDraftState(draft));
        }
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

  const handleCreateRule = async () => {
    if (!formId) {
      messageApi.error("缺少表单 ID，无法创建规则");
      return;
    }

    setCreating(true);
    try {
      const created = await createInteractionRuleOnServer(formId);
      dispatch(initializeInteractionRuleDraftState(created));
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
      messageApi.success("规则草稿已创建");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建规则失败");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!ruleDraft.initialized) {
      messageApi.error("请先新建或选择一条规则");
      return;
    }

    if (!ruleDraft.meta.ruleName.trim()) {
      messageApi.error("规则名称不能为空");
      return;
    }

    dispatch(setInteractionRuleSaveStatus({ status: "saving" }));
    try {
      const saved = await saveInteractionRuleDraftToServer({
        meta: ruleDraft.meta,
        graphJson: ruleDraft.graphJson,
        compiledJson: ruleDraft.compiledJson,
      });
      dispatch(initializeInteractionRuleDraftState(saved));
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
      dispatch(setInteractionRuleSaveStatus({ status: "success" }));
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
              type="primary"
              icon={<SaveOutlined />}
              loading={ruleDraft.saveStatus === "saving"}
              onClick={() => void handleSaveDraft()}
            >
              保存草稿
            </Button>
          </Space>
        </div>

        {!formId ? <Alert type="warning" showIcon message="请从表单编辑器进入交互规则页。" /> : null}

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr) 320px", gap: 16 }}>
          <Card
            title="规则列表"
            size="small"
            extra={<Tag color="blue">{ruleList.length} 条</Tag>}
            bodyStyle={{ padding: 0, minHeight: 520 }}
          >
            {loadingList ? (
              <div style={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : ruleList.length === 0 ? (
              <div style={{ minHeight: 520, display: "grid", placeItems: "center" }}>
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

          <Card title="规则画布" size="small" bodyStyle={{ minHeight: 520 }}>
            {loadingDraft ? (
              <div style={{ minHeight: 520, display: "grid", placeItems: "center" }}>
                <Spin />
              </div>
            ) : ruleDraft.initialized ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Alert
                  type="info"
                  showIcon
                  message="Sprint 1 当前只打通规则基础骨架，画布编排会在 Sprint 2 落地。"
                />
                <Card size="small" title="画布占位区">
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                    当前规则已完成元信息编辑和草稿保存。这里暂时保留为图编排占位区，后续会接入节点面板、连线和诊断能力。
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
                    {JSON.stringify(
                      {
                        graphJson: ruleDraft.graphJson,
                        compiledJson: ruleDraft.compiledJson,
                      },
                      null,
                      2
                    )}
                  </pre>
                </Card>
              </Space>
            ) : (
              <div style={{ minHeight: 520, display: "grid", placeItems: "center" }}>
                <Empty description="请选择一条规则，或先新建规则草稿" />
              </div>
            )}
          </Card>

          <RuleMetaForm />
        </div>
      </Space>
    </div>
  );
}
