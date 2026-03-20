import { Card, Empty, Input, Select, Space, Typography } from "antd";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleNodeData,
  type InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";

type RuleNodePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
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

export function RuleNodePropertyPanel({ graphState, embedded = false }: RuleNodePropertyPanelProps) {
  const dispatch = useAppDispatch();
  const selectedNode = graphState.graph.nodes.find((item) => item.id === graphState.selectedNodeId) ?? null;

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
      <div>
        <Typography.Text type="secondary">触发目标</Typography.Text>
        <Input
          value={String(selectedNode.data.targetField ?? "")}
          onChange={(event) =>
            dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { targetField: event.target.value } }))
          }
          placeholder="字段触发节点推荐填写"
        />
      </div>
      <div>
        <Typography.Text type="secondary">命令/动作</Typography.Text>
        {selectedNode.type === "command" ? (
          <Select
            value={typeof selectedNode.data.command === "string" ? selectedNode.data.command : "setValue"}
            options={COMMAND_OPTIONS}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { command: value } }))
            }
            style={{ width: "100%" }}
          />
        ) : (
          <Input
            value={String(selectedNode.data.command ?? "")}
            onChange={(event) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { command: event.target.value } }))
            }
            placeholder="例如 setValue / setReadonly"
          />
        )}
      </div>
      {selectedNode.type === "command" ? (
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
        </>
      ) : null}
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
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="节点属性" size="small">{content}</Card>;
}
