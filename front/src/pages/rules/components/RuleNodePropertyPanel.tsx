import { Card, Empty, Input, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleNodeData,
  type InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";
import type { Node, NodesById } from "../../../types/schema/node";
import { loadDraftFromServer } from "../../editor/services/formPersistence";

type RuleNodePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
};

type FieldOption = {
  label: string;
  value: string;
};

const BRANCH_OPTIONS = [
  { label: "默认成功", value: "success" },
  { label: "失败分支", value: "failure" },
  { label: "条件为真", value: "true" },
  { label: "条件为假", value: "false" },
  { label: "为空", value: "empty" },
  { label: "非空", value: "nonEmpty" },
];

const CONDITION_OPERATOR_OPTIONS = [
  { label: "等于", value: "eq" },
  { label: "不等于", value: "ne" },
  { label: "大于", value: "gt" },
  { label: "大于等于", value: "gte" },
  { label: "小于", value: "lt" },
  { label: "小于等于", value: "lte" },
  { label: "包含", value: "contains" },
  { label: "为空", value: "isEmpty" },
];

const COMMAND_OPTIONS = [
  { label: "设置值", value: "setValue" },
  { label: "清空值", value: "clearValue" },
  { label: "设置显示", value: "setVisible" },
  { label: "设置只读", value: "setReadonly" },
  { label: "设置必填", value: "setRequired" },
];

function isFieldNode(node: Node) {
  return node.type === "field";
}

function getNodeLabel(node: Node) {
  if (typeof node.props.label === "string" && node.props.label.trim()) {
    return node.props.label.trim();
  }
  if (typeof node.props.title === "string" && node.props.title.trim()) {
    return node.props.title.trim();
  }
  return node.id;
}

function findDetailTableAncestor(node: Node, nodesById: NodesById): Node | null {
  let currentParentId = node.parentId;
  while (currentParentId) {
    const parent = nodesById[currentParentId];
    if (!parent) {
      return null;
    }
    if (parent.type === "detail_table") {
      return parent;
    }
    currentParentId = parent.parentId;
  }
  return null;
}

function buildFieldOptions(nodesById: NodesById) {
  return Object.values(nodesById)
    .filter((node) => isFieldNode(node))
    .map((node) => {
      const serverId = typeof node.serverId === "string" && node.serverId.trim() ? node.serverId.trim() : node.id;
      const detailTable = findDetailTableAncestor(node, nodesById);
      const path = detailTable
        ? `detail.${typeof detailTable.serverId === "string" && detailTable.serverId.trim() ? detailTable.serverId.trim() : detailTable.id}.${serverId}`
        : `main.${serverId}`;
      const scopeLabel = detailTable ? `明细表 / ${getNodeLabel(detailTable)}` : "主表";
      return {
        label: `${getNodeLabel(node)} (${path})`,
        value: path,
        scopeLabel,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

function useCurrentFormFieldOptions(formId: string | null) {
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    if (!formId) {
      setFieldOptions([]);
      return;
    }

    void loadDraftFromServer(formId)
      .then((draft) => {
        setFieldOptions(
          buildFieldOptions(draft.nodesById).map((item) => ({
            label: `${item.scopeLabel} · ${item.label}`,
            value: item.value,
          }))
        );
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
  const fieldOptionMap = useMemo(() => new Map(fieldOptions.map((item) => [item.value, item.label])), [fieldOptions]);
  const showFieldReference = selectedNode?.type === "condition" || selectedNode?.type === "query" || selectedNode?.type === "transform";
  const showTriggerTarget = selectedNode?.type === "trigger";
  const showCommandConfig = selectedNode?.type === "command";
  const showBranchSelector = selectedNode?.type === "condition" || selectedNode?.type === "query" || selectedNode?.type === "transform" || selectedNode?.type === "notice";

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
            options={fieldOptions}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: String(value ?? "") } }))
            }
            placeholder={fieldOptions.length > 0 ? "选择字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
          {typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey && fieldOptionMap.has(selectedNode.data.fieldKey) ? null : (
            typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? (
              <Typography.Text type="secondary">
                当前值未匹配到字段，保留原配置：{selectedNode.data.fieldKey}
              </Typography.Text>
            ) : null
          )}
        </div>
      ) : null}
      {selectedNode.type === "condition" ? (
        <>
          <div>
            <Typography.Text type="secondary">条件运算符</Typography.Text>
            <Select
              value={typeof selectedNode.data.operator === "string" ? selectedNode.data.operator : "eq"}
              options={CONDITION_OPERATOR_OPTIONS}
              onChange={(value) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { operator: value } }))
              }
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Typography.Text type="secondary">比较值</Typography.Text>
            <Input
              value={String(selectedNode.data.literalValue ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
              }
              placeholder="例如 yes / 100 / true"
            />
          </div>
        </>
      ) : null}
      {showTriggerTarget ? (
        <div>
          <Typography.Text type="secondary">触发目标</Typography.Text>
          <Select
            showSearch
            allowClear
            value={typeof selectedNode.data.targetField === "string" && selectedNode.data.targetField ? selectedNode.data.targetField : undefined}
            options={fieldOptions}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { targetField: String(value ?? "") } }))
            }
            placeholder={fieldOptions.length > 0 ? "选择触发字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
        </div>
      ) : null}
      {showCommandConfig ? (
        <div>
          <Typography.Text type="secondary">命令/动作</Typography.Text>
          <Select
            value={typeof selectedNode.data.command === "string" ? selectedNode.data.command : "setValue"}
            options={COMMAND_OPTIONS}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { command: value } }))
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
      {showBranchSelector ? (
        <div>
          <Typography.Text type="secondary">默认分支标签</Typography.Text>
          <Select
            value={typeof selectedNode.data.branch === "string" ? selectedNode.data.branch : "success"}
            options={BRANCH_OPTIONS}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { branch: value } }))
            }
            style={{ width: "100%" }}
          />
        </div>
      ) : null}
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="节点属性" size="small">{content}</Card>;
}
