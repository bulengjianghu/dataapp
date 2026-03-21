import { Card, Empty, Input, Select, Space, Tag, Typography, Button, Alert } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleEdge,
  type InteractionRuleGraphState,
  type RuleEdgeConditionItem,
  type RuleEdgeConditionOperator,
} from "../../../store/slices/interactionRuleGraphSlice";
import {
  loadInteractionRuleFieldOptions,
  type RuleFormFieldOption,
} from "../services/interactionRuleFormFields";

type RuleEdgePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
};

const FLOW_TYPE_OPTIONS: Array<{ label: string; value: "direct" | "condition" }> = [
  { label: "直接流转", value: "direct" },
  { label: "条件流转", value: "condition" },
];

const CONDITION_OPERATOR_OPTIONS: Array<{ label: string; value: RuleEdgeConditionOperator }> = [
  { label: "等于", value: "eq" },
  { label: "不等于", value: "ne" },
  { label: "大于", value: "gt" },
  { label: "大于等于", value: "gte" },
  { label: "小于", value: "lt" },
  { label: "小于等于", value: "lte" },
  { label: "包含", value: "contains" },
  { label: "为空", value: "isEmpty" },
];

function useCurrentFormFieldOptions(formId: string | null) {
  const [fieldOptions, setFieldOptions] = useState<RuleFormFieldOption[]>([]);

  useEffect(() => {
    if (!formId) {
      setFieldOptions([]);
      return;
    }

    void loadInteractionRuleFieldOptions(formId)
      .then((options) => setFieldOptions(options))
      .catch(() => setFieldOptions([]));
  }, [formId]);

  return fieldOptions;
}

function createConditionItem(): RuleEdgeConditionItem {
  return {
    id: `cond_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    fieldKey: "",
    operator: "eq",
    literalValue: "",
  };
}

export function RuleEdgePropertyPanel({ graphState, embedded = false }: RuleEdgePropertyPanelProps) {
  const dispatch = useAppDispatch();
  const selectedEdge = graphState.graph.edges.find((item) => item.id === graphState.selectedEdgeId) ?? null;
  const sourceNode = selectedEdge
    ? graphState.graph.nodes.find((item) => item.id === selectedEdge.source) ?? null
    : null;
  const fieldOptions = useCurrentFormFieldOptions(graphState.formId);
  const fieldSelectOptions = useMemo(
    () =>
      fieldOptions.map((item) => ({
        label: `${item.scopeLabel} · ${item.label}`,
        value: item.value,
      })),
    [fieldOptions]
  );
  const fieldMetaMap = useMemo(
    () => new Map(fieldOptions.map((item) => [item.value, item])),
    [fieldOptions]
  );

  if (!selectedEdge) {
    const empty = <Empty description="请选择一条连线" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    if (embedded) {
      return empty;
    }
    return <Card title="连线属性" size="small">{empty}</Card>;
  }

  const canEditFlowType = sourceNode?.type === "branch";
  const flowType = canEditFlowType ? selectedEdge.flowType ?? "condition" : "direct";
  const conditions = Array.isArray(selectedEdge.conditions) ? selectedEdge.conditions : [];

  const updateConditions = (nextConditions: RuleEdgeConditionItem[]) => {
    dispatch(updateRuleEdge({ edgeId: selectedEdge.id, patch: { conditions: nextConditions } }));
  };

  const content = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div>
        <Typography.Text type="secondary">流转类型</Typography.Text>
        <Select
          value={flowType}
          options={FLOW_TYPE_OPTIONS}
          disabled={!canEditFlowType}
          onChange={(value) =>
            dispatch(
              updateRuleEdge({
                edgeId: selectedEdge.id,
                patch: {
                  flowType: value,
                  conditionLogic: value === "condition" ? selectedEdge.conditionLogic ?? "and" : undefined,
                  conditions: value === "condition" ? conditions : [],
                },
              })
            )
          }
          style={{ width: "100%" }}
        />
      </div>
      {!canEditFlowType ? (
        <Alert
          type="info"
          showIcon
          message="普通节点只支持直接流转"
          description="只有分流节点后的连线允许配置为条件流转。"
        />
      ) : null}
      {flowType === "condition" ? (
        <>
          <div>
            <Typography.Text type="secondary">条件关系</Typography.Text>
            <Select
              value={selectedEdge.conditionLogic ?? "and"}
              options={[
                { label: "且（AND）", value: "and" },
                { label: "或（OR）", value: "or" },
              ]}
              onChange={(value) =>
                dispatch(updateRuleEdge({ edgeId: selectedEdge.id, patch: { conditionLogic: value } }))
              }
              style={{ width: "100%" }}
            />
          </div>
          {conditions.map((condition, index) => {
            const fieldMeta = fieldMetaMap.get(condition.fieldKey);
            const literalOptions =
              fieldMeta?.options?.map((item) => ({
                label: `${item.label} (${item.value})`,
                value: item.value,
              })) ?? [];

            return (
              <Card
                key={condition.id}
                size="small"
                title={`条件 ${index + 1}`}
                extra={
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => updateConditions(conditions.filter((item) => item.id !== condition.id))}
                  />
                }
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <div>
                    <Typography.Text type="secondary">字段</Typography.Text>
                    <Select
                      showSearch
                      allowClear
                      value={condition.fieldKey || undefined}
                      options={fieldSelectOptions}
                      optionFilterProp="label"
                      onChange={(value) =>
                        updateConditions(
                          conditions.map((item) =>
                            item.id === condition.id ? { ...item, fieldKey: String(value ?? ""), literalValue: "" } : item
                          )
                        )
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary">运算符</Typography.Text>
                    <Select
                      value={condition.operator}
                      options={CONDITION_OPERATOR_OPTIONS}
                      onChange={(value) =>
                        updateConditions(
                          conditions.map((item) =>
                            item.id === condition.id ? { ...item, operator: value } : item
                          )
                        )
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  {condition.operator !== "isEmpty" ? (
                    <div>
                      <Typography.Text type="secondary">比较值</Typography.Text>
                      {literalOptions.length > 0 ? (
                        <Select
                          showSearch
                          allowClear
                          value={condition.literalValue || undefined}
                          options={literalOptions}
                          optionFilterProp="label"
                          onChange={(value) =>
                            updateConditions(
                              conditions.map((item) =>
                                item.id === condition.id ? { ...item, literalValue: String(value ?? "") } : item
                              )
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        <Input
                          value={condition.literalValue ?? ""}
                          onChange={(event) =>
                            updateConditions(
                              conditions.map((item) =>
                                item.id === condition.id ? { ...item, literalValue: event.target.value } : item
                              )
                            )
                          }
                        />
                      )}
                    </div>
                  ) : null}
                </Space>
              </Card>
            );
          })}
          <Button
            block
            icon={<PlusOutlined />}
            onClick={() => updateConditions([...conditions, createConditionItem()])}
          >
            新增条件
          </Button>
          {conditions.length === 0 ? <Tag color="warning">当前条件流转未配置命中条件</Tag> : null}
        </>
      ) : (
        <Tag color="blue">当前连线会直接流转到后续节点</Tag>
      )}
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="连线属性" size="small">{content}</Card>;
}
