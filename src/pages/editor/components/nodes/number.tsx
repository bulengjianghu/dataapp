import { InputNumber } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const numberNodeDefinition: ComponentNodeDefinition = {
  key: "number",
  title: "数字",
  createDefaultProps: () => ({
    component: "number",
    label: "数字",
    placeholder: "请输入数字",
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
    <InputNumber
      disabled
      style={{ width: "100%" }}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入数字"}
    />
  ),
  renderRuntime: (node) => (
    <InputNumber
      style={{ width: "100%" }}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入数字"}
    />
  ),
};
