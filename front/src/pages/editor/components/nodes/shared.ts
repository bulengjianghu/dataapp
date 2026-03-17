import type { PropertyGroupSchema } from "./types";

export const defaultLayoutGroup: PropertyGroupSchema = {
  key: "layout",
  title: "布局",
  fields: [
    {
      key: "span",
      label: "宽度",
      target: "layout",
      control: "select",
      options: [
        { label: "1/4", value: 6 },
        { label: "1/3", value: 8 },
        { label: "1/2", value: 12 },
        { label: "整行", value: 24 },
      ],
    },
  ],
};

export const baseFieldGroup: PropertyGroupSchema = {
  key: "basic",
  title: "基础",
  fields: [
    {
      key: "label",
      label: "标题",
      target: "props",
      control: "input",
      placeholder: "请输入字段标题",
    },
    {
      key: "helpText",
      label: "帮助文案",
      target: "props",
      control: "textarea",
      rows: 3,
      placeholder: "可选，展示在字段下方",
    },
    {
      key: "required",
      label: "必填",
      target: "props",
      control: "switch",
    },
  ],
};

export function normalizeOptions(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
    .map((item, index) => ({
      label: typeof item.label === "string" && item.label.trim() ? item.label : `选项 ${index + 1}`,
      value:
        typeof item.value === "string" && item.value.trim()
          ? item.value
          : `option-${index + 1}`,
    }));
}

export function resolveNodeComponentKey(node: { type: string; props: Record<string, unknown> }): string {
  if (typeof node.props.component === "string") {
    return node.props.component;
  }
  if (node.type === "container") {
    return "container";
  }
  if (node.type === "detail_table") {
    return "detail-table";
  }
  return "";
}
