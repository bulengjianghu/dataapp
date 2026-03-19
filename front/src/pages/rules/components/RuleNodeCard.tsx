import { DeleteOutlined } from "@ant-design/icons";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Button, Popconfirm, Tag, Typography } from "antd";
import type { RuleGraphNode } from "../../../store/slices/interactionRuleGraphSlice";

const NODE_TYPE_META: Record<RuleGraphNode["type"], { title: string; accent: string }> = {
  trigger: { title: "触发器", accent: "#1677ff" },
  condition: { title: "条件", accent: "#faad14" },
  query: { title: "查询", accent: "#13c2c2" },
  transform: { title: "转换", accent: "#52c41a" },
  command: { title: "命令", accent: "#722ed1" },
  notice: { title: "通知", accent: "#eb2f96" },
  end: { title: "结束", accent: "#2f54eb" },
};

type RuleNodeData = RuleGraphNode["data"] & {
  label?: string;
  description?: string;
  diagnosticLevel?: "error" | "warning";
  onDelete?: () => void;
};

type RuleFlowNode = Node<RuleNodeData, RuleGraphNode["type"]>;

export function RuleNodeCard({ data, selected, type }: NodeProps<RuleFlowNode>) {
  const meta = NODE_TYPE_META[type];
  const nodeData = data as RuleNodeData;

  return (
    <div
      className={`rule-graph-node${selected ? " is-selected" : ""}`}
      style={{ ["--rule-node-accent" as string]: meta.accent }}
    >
      {selected && nodeData.onDelete ? (
        <div className="rule-graph-node__actions" onClick={(event) => event.stopPropagation()}>
          <Popconfirm
            title="确认删除？"
            description="删除后不可恢复"
            okText="删除"
            cancelText="取消"
            onConfirm={() => nodeData.onDelete?.()}
          >
            <Button danger size="small" shape="circle" icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ) : null}
      <Handle type="target" position={Position.Left} className="rule-graph-node__handle" />
      <div className="rule-graph-node__head">
        <Tag bordered={false} color={meta.accent}>
          {meta.title}
        </Tag>
        {nodeData.diagnosticLevel ? (
          <span className={`rule-graph-node__dot is-${nodeData.diagnosticLevel}`} />
        ) : null}
        <Typography.Text strong>{nodeData.label ?? meta.title}</Typography.Text>
      </div>
      <Typography.Paragraph className="rule-graph-node__body" ellipsis={{ rows: 2 }}>
        {typeof nodeData.description === "string" && nodeData.description.trim()
          ? nodeData.description
          : "点击右侧属性面板完善节点配置"}
      </Typography.Paragraph>
      <Handle type="source" position={Position.Right} className="rule-graph-node__handle" />
    </div>
  );
}
