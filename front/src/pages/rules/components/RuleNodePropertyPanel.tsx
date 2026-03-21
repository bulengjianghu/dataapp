import { Card, Empty, Input, Select, Space, Typography, Alert } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleNodeData,
  type InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";
import {
  loadInteractionRuleFieldOptions,
  type RuleFormFieldOption,
} from "../services/interactionRuleFormFields";

type RuleNodePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
};

const COMMAND_OPTIONS = [
  { label: "设置值", value: "setValue" },
  { label: "清空值", value: "clearValue" },
  { label: "设置显示", value: "setVisible" },
  { label: "设置只读", value: "setReadonly" },
  { label: "设置必填", value: "setRequired" },
  { label: "设置选项", value: "setOptions" },
  { label: "设置筛选条件", value: "setFilter" },
];

function useCurrentFormFieldOptions(formId: string | null) {
  const [fieldOptions, setFieldOptions] = useState<RuleFormFieldOption[]>([]);

  useEffect(() => {
    if (!formId) {
      setFieldOptions([]);
      return;
    }

    void loadInteractionRuleFieldOptions(formId)
      .then((options) => {
        setFieldOptions(options);
      })
      .catch(() => {
        setFieldOptions([]);
      });
  }, [formId]);

  return fieldOptions;
}

export function RuleNodePropertyPanel({ graphState, embedded = false }: RuleNodePropertyPanelProps) {
  const dispatch = useAppDispatch();
  const selectedNode = graphState.graph.nodes.find((item) => item.id === graphState.selectedNodeId) ?? null;
  const fieldOptions = useCurrentFormFieldOptions(graphState.formId);
  const fieldSelectOptions = useMemo(
    () =>
      fieldOptions.map((item) => ({
        label: `${item.scopeLabel} · ${item.label}`,
        value: item.value,
      })),
    [fieldOptions]
  );
  const fieldOptionMap = useMemo(
    () => new Map(fieldSelectOptions.map((item) => [item.value, item.label])),
    [fieldSelectOptions]
  );
  const showFieldReference =
    selectedNode?.type === "query" ||
    selectedNode?.type === "transform" ||
    selectedNode?.type === "context";
  const showTriggerTarget = selectedNode?.type === "trigger";
  const showCommandConfig = selectedNode?.type === "command";
  const showContextConfig = selectedNode?.type === "context";
  if (!selectedNode) {
    const empty = <Empty description="请选择一个节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    if (embedded) {
      return empty;
    }
    return <Card title="节点属性" size="small">{empty}</Card>;
  }

  const content = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div>
        <Typography.Text type="secondary">节点名称</Typography.Text>
        <Input
          value={String(selectedNode.data.label ?? "")}
          onChange={(event) =>
            dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { label: event.target.value } }))
          }
        />
      </div>
      <div>
        <Typography.Text type="secondary">节点描述</Typography.Text>
        <Input.TextArea
          rows={3}
          value={String(selectedNode.data.description ?? "")}
          onChange={(event) =>
            dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { description: event.target.value } }))
          }
        />
      </div>
      {showFieldReference ? (
        <div>
          <Typography.Text type="secondary">字段引用</Typography.Text>
          <Select
            showSearch
            allowClear
            value={typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? selectedNode.data.fieldKey : undefined}
            options={fieldSelectOptions}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: String(value ?? "") } }))
            }
            placeholder={fieldSelectOptions.length > 0 ? "选择字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
          {typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey && fieldOptionMap.has(selectedNode.data.fieldKey) ? null : (
            typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? (
              <Typography.Text type="danger">
                当前值未匹配到字段，保留原配置：{selectedNode.data.fieldKey}
              </Typography.Text>
            ) : null
          )}
        </div>
      ) : null}
      {selectedNode.type === "branch" ? (
        <>
          <Alert
            type="info"
            showIcon
            message="分流节点只负责分流"
            description="具体判断条件配置在每条条件流转连线上。直接流转边会无条件进入后续子链。"
          />
        </>
      ) : null}
      {showTriggerTarget ? (
        <div>
          <Typography.Text type="secondary">触发目标</Typography.Text>
          <Select
            showSearch
            allowClear
            value={
              typeof selectedNode.data.triggerTarget === "string" && selectedNode.data.triggerTarget
                ? selectedNode.data.triggerTarget
                : typeof selectedNode.data.targetField === "string" && selectedNode.data.targetField
                  ? selectedNode.data.targetField
                  : undefined
            }
            options={fieldSelectOptions}
            onChange={(value) =>
              dispatch(
                updateRuleNodeData({
                  nodeId: selectedNode.id,
                  patch: { triggerTarget: String(value ?? ""), targetField: String(value ?? "") },
                })
              )
            }
            placeholder={fieldSelectOptions.length > 0 ? "选择触发字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
          {typeof (selectedNode.data.triggerTarget ?? selectedNode.data.targetField) === "string" &&
          String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField) &&
          fieldOptionMap.has(String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField)) ? null : typeof (selectedNode.data.triggerTarget ?? selectedNode.data.targetField) === "string" &&
            String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField) ? (
            <Typography.Text type="danger">
              当前值未匹配到字段，保留原配置：{String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField)}
            </Typography.Text>
          ) : null}
        </div>
      ) : null}
      {showCommandConfig ? (
        <div>
          <Typography.Text type="secondary">操作字段</Typography.Text>
          <Select
            showSearch
            allowClear
            value={typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? selectedNode.data.fieldKey : undefined}
            options={fieldSelectOptions}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: String(value ?? "") } }))
            }
            placeholder={fieldSelectOptions.length > 0 ? "选择操作字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
          {typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey && fieldOptionMap.has(selectedNode.data.fieldKey) ? null : (
            typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? (
              <Typography.Text type="danger">
                当前值未匹配到字段，保留原配置：{selectedNode.data.fieldKey}
              </Typography.Text>
            ) : null
          )}
        </div>
      ) : null}
      {showCommandConfig ? (
        <div>
          <Typography.Text type="secondary">命令/动作</Typography.Text>
          <Select
            value={
              typeof selectedNode.data.commandType === "string"
                ? selectedNode.data.commandType
                : typeof selectedNode.data.command === "string"
                  ? selectedNode.data.command
                  : "setValue"
            }
            options={COMMAND_OPTIONS}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { commandType: value, command: value } }))
            }
            style={{ width: "100%" }}
          />
        </div>
      ) : null}
      {showCommandConfig ? (
        <>
          <div>
            <Typography.Text type="secondary">字面量值</Typography.Text>
            <Input
              value={String(selectedNode.data.literalValue ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
              }
              placeholder="布尔类命令请填写 true / false"
            />
          </div>
          <div>
            <Typography.Text type="secondary">值来源变量</Typography.Text>
            <Input
              value={String(selectedNode.data.valueFrom ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { valueFrom: event.target.value } }))
              }
              placeholder="例如 temp.totalAmount / event.value"
            />
          </div>
          <Typography.Text type="secondary">
            操作字段已改为从当前表单字段中选择，运行时会按所选字段路径执行命令。
          </Typography.Text>
        </>
      ) : null}
      {showContextConfig ? (
        <>
          <div>
            <Typography.Text type="secondary">写入变量名</Typography.Text>
            <Input
              value={String(selectedNode.data.saveAs ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { saveAs: event.target.value } }))
              }
              placeholder="例如 temp.totalAmount / matchedRecord"
            />
          </div>
          <div>
            <Typography.Text type="secondary">变量来源</Typography.Text>
            <Input
              value={String(selectedNode.data.valueFrom ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { valueFrom: event.target.value } }))
              }
              placeholder="例如 main.amount / event.value / temp.queryResult"
            />
          </div>
          <div>
            <Typography.Text type="secondary">兜底字面量值</Typography.Text>
            <Input
              value={String(selectedNode.data.literalValue ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
              }
              placeholder="来源为空时写入的值"
            />
          </div>
        </>
      ) : null}
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="节点属性" size="small">{content}</Card>;
}
