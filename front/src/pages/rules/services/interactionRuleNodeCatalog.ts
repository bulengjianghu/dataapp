import type { RuleGraphNode, RuleNodeType } from "../../../store/slices/interactionRuleGraphSlice";

export type RuleNodeCatalogItem = {
  key: string;
  type: RuleNodeType;
  label: string;
  description: string;
  accent: string;
  group: "基础" | "命令";
  tagLabel?: string;
  presetData?: Record<string, unknown>;
};

type BaseRuleNodeCatalogMeta = {
  label: string;
  description: string;
  accent: string;
};

export const RULE_NODE_TYPE_META: Record<RuleNodeType, BaseRuleNodeCatalogMeta> = {
  trigger: { label: "触发器", description: "规则起点，描述事件来源和触发目标。", accent: "#1677ff" },
  branch: { label: "分流", description: "将执行流分发到多条直接流转或条件流转线路。", accent: "#faad14" },
  query: { label: "查询", description: "读取当前表单、上下文或外部数据。", accent: "#13c2c2" },
  transform: { label: "转换", description: "做字段映射、过滤、聚合、计算。", accent: "#52c41a" },
  command: { label: "命令", description: "向运行时发出 setValue / setReadonly 等命令。", accent: "#722ed1" },
  context: { label: "上下文", description: "在当前执行上下文中写入临时变量。", accent: "#2f54eb" },
  notice: { label: "通知", description: "给用户提示或写入调试日志。", accent: "#eb2f96" },
};

const BASE_RULE_NODE_PALETTE_ITEMS: RuleNodeCatalogItem[] = (
  Object.entries(RULE_NODE_TYPE_META) as Array<[RuleNodeType, BaseRuleNodeCatalogMeta]>
)
  .filter(([type]) => type !== "command")
  .map(([type, meta]) => ({
  key: type,
  type,
  ...meta,
  group: "基础",
  tagLabel: type,
}));

const COMMAND_RULE_NODE_PALETTE_ITEMS: RuleNodeCatalogItem[] = [
  {
    key: "command_set_value",
    type: "command",
    label: "设置值",
    description: "给字段设置固定值或来自上下文变量的值。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setValue",
    presetData: { label: "设置值", commandType: "setValue", command: "setValue", targetType: "", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_clear_value",
    type: "command",
    label: "清空值",
    description: "清空目标字段当前值。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "clearValue",
    presetData: { label: "清空值", commandType: "clearValue", command: "clearValue", targetType: "", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_set_visible",
    type: "command",
    label: "设置显示",
    description: "控制字段或明细表的显示状态。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setVisible",
    presetData: { label: "设置显示", commandType: "setVisible", command: "setVisible" },
  },
  {
    key: "command_set_readonly",
    type: "command",
    label: "设置只读",
    description: "控制字段或明细表的只读状态。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setReadonly",
    presetData: { label: "设置只读", commandType: "setReadonly", command: "setReadonly" },
  },
  {
    key: "command_set_required",
    type: "command",
    label: "设置必填",
    description: "控制字段是否必填。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setRequired",
    presetData: { label: "设置必填", commandType: "setRequired", command: "setRequired", targetType: "", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_set_options",
    type: "command",
    label: "设置选项",
    description: "把转换后的候选项写入字段选项。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setOptions",
    presetData: { label: "设置选项", commandType: "setOptions", command: "setOptions", targetType: "", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_set_filter",
    type: "command",
    label: "设置筛选",
    description: "更新关联选择等组件的筛选条件。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "setFilter",
    presetData: { label: "设置筛选", commandType: "setFilter", command: "setFilter", targetType: "", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_append_row",
    type: "command",
    label: "追加明细行",
    description: "将变量中的一行或多行数据追加到目标明细表。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "appendRow",
    presetData: { label: "追加明细行", commandType: "appendRow", command: "appendRow", targetType: "detail_table", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_update_row",
    type: "command",
    label: "更新明细行",
    description: "按筛选条件批量更新目标明细表中的行。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "updateRow",
    presetData: { label: "更新明细行", commandType: "updateRow", command: "updateRow", targetType: "detail_table", fieldKey: "", detailTableKey: "" },
  },
  {
    key: "command_replace_table",
    type: "command",
    label: "替换明细表",
    description: "用变量中的整表数据替换目标明细表。",
    accent: "#722ed1",
    group: "命令",
    tagLabel: "replaceTable",
    presetData: { label: "替换明细表", commandType: "replaceTable", command: "replaceTable", targetType: "detail_table", fieldKey: "", detailTableKey: "" },
  },
];

export const RULE_NODE_PALETTE_ITEMS: RuleNodeCatalogItem[] = [
  ...BASE_RULE_NODE_PALETTE_ITEMS,
  ...COMMAND_RULE_NODE_PALETTE_ITEMS,
];

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function createDefaultRuleNode(
  type: RuleNodeType,
  position: { x: number; y: number },
  presetData?: Record<string, unknown>
): RuleGraphNode {
  const baseData: Record<string, unknown> = {
    label: RULE_NODE_TYPE_META[type].label,
    description: "",
  };

  if (type === "trigger") {
    baseData.eventType = "FIELD_CHANGE_MAIN";
    baseData.triggerTarget = "";
  }
  if (type === "query") {
    baseData.sourceType = "relation_records";
    baseData.sourceFormId = "";
    baseData.saveAs = "queryResult";
    baseData.displayFields = [];
    baseData.filters = [];
  }
  if (type === "transform") {
    baseData.transformType = "expression";
    baseData.input = "";
    baseData.output = "transformedValue";
    baseData.saveAs = "transformedValue";
  }
  if (type === "context") {
    baseData.fieldKey = "";
  }
  if (type === "command") {
    baseData.fieldKey = "";
    baseData.commandType = "setValue";
  }
  if (type === "context") {
    baseData.saveAs = "tempValue";
  }

  return {
    id: createNodeId(),
    type,
    position,
    data: {
      ...baseData,
      ...(presetData ?? {}),
    },
  };
}
