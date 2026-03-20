import type { RuleGraphNode, RuleNodeType } from "../../../store/slices/interactionRuleGraphSlice";

export type RuleNodeCatalogItem = {
  type: RuleNodeType;
  label: string;
  description: string;
  accent: string;
};

export const RULE_NODE_TYPE_META: Record<RuleNodeType, Omit<RuleNodeCatalogItem, "type">> = {
  trigger: { label: "触发器", description: "规则起点，描述事件来源和触发目标。", accent: "#1677ff" },
  condition: { label: "条件", description: "根据表达式决定 true / false 分支。", accent: "#faad14" },
  query: { label: "查询", description: "读取当前表单、上下文或外部数据。", accent: "#13c2c2" },
  transform: { label: "转换", description: "做字段映射、过滤、聚合、计算。", accent: "#52c41a" },
  command: { label: "命令", description: "向运行时发出 setValue / setReadonly 等命令。", accent: "#722ed1" },
  context: { label: "上下文", description: "在当前执行上下文中写入临时变量。", accent: "#2f54eb" },
  notice: { label: "通知", description: "给用户提示或写入调试日志。", accent: "#eb2f96" },
};

export const RULE_NODE_PALETTE_ITEMS: RuleNodeCatalogItem[] = (
  Object.entries(RULE_NODE_TYPE_META) as Array<[RuleNodeType, Omit<RuleNodeCatalogItem, "type">]>
).map(([type, meta]) => ({
  type,
  ...meta,
}));

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function createDefaultRuleNode(type: RuleNodeType, position: { x: number; y: number }): RuleGraphNode {
  return {
    id: createNodeId(),
    type,
    position,
    data: {
      label: RULE_NODE_TYPE_META[type].label,
      description: "",
      triggerTarget: "",
      fieldKey: "",
      commandType: type === "command" ? "setValue" : "",
      branch: "success",
      saveAs: type === "context" ? "tempValue" : "",
    },
  };
}
