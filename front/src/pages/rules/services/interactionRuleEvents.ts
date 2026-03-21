import type { InteractionEventType } from "../../../store/slices/interactionRuleDraftSlice";

export const INTERACTION_EVENT_TYPE_OPTIONS: Array<{ label: string; value: InteractionEventType }> = [
  { label: "主表字段变化", value: "FIELD_CHANGE_MAIN" },
  { label: "明细字段变化", value: "FIELD_CHANGE_DETAIL" },
  { label: "明细行新增", value: "DETAIL_ROW_ADDED" },
  { label: "明细行删除", value: "DETAIL_ROW_REMOVED" },
  { label: "关联选择打开", value: "RELATION_OPEN" },
  { label: "关联选择确认", value: "RELATION_SELECTED" },
  { label: "表单初始化", value: "FORM_INIT" },
  { label: "提交前校验", value: "FORM_SUBMIT_BEFORE" },
];

export function isInteractionEventType(value: unknown): value is InteractionEventType {
  return INTERACTION_EVENT_TYPE_OPTIONS.some((item) => item.value === value);
}
