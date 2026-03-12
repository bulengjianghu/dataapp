import { Select } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup, normalizeOptions } from "./shared";

export const selectNodeDefinition: ComponentNodeDefinition = {
  key: "select",
  title: "下拉",
  createDefaultProps: () => ({
    component: "select",
    label: "下拉",
    placeholder: "请选择",
    required: false,
    helpText: "",
    options: [
      { label: "选项 1", value: "option-1" },
      { label: "选项 2", value: "option-2" },
    ],
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
        {
          key: "options",
          label: "选项",
          target: "props",
          control: "options",
          placeholder: "每行一个选项",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderEditorPreview: (node) => (
    <Select
      disabled
      options={normalizeOptions(node.props.options)}
      placeholder={(node.props.placeholder as string | undefined) ?? "请选择"}
    />
  ),
};
