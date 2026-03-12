import { DatePicker } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const dateNodeDefinition: ComponentNodeDefinition = {
  key: "date",
  title: "日期",
  createDefaultProps: () => ({
    component: "date",
    label: "日期",
    placeholder: "请选择日期",
    required: false,
    helpText: "",
  }),
  propertyGroups: [
    baseFieldGroup,
    {
      key: "component",
      title: "组件",
      fields: [
        {
          key: "placeholder",
          label: "占位提示",
          target: "props",
          control: "input",
          placeholder: "请输入占位提示",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderEditorPreview: (node) => (
    <DatePicker
      disabled
      style={{ width: "100%" }}
      placeholder={(node.props.placeholder as string | undefined) ?? "请选择日期"}
    />
  ),
};
