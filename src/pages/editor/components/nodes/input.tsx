import { Input } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const inputNodeDefinition: ComponentNodeDefinition = {
  key: "input",
  title: "单行文本",
  createDefaultProps: () => ({
    component: "input",
    label: "单行文本",
    placeholder: "请输入",
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
    <Input
      disabled
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入"}
      value=""
    />
  ),
  renderRuntime: (node) => (
    <Input placeholder={(node.props.placeholder as string | undefined) ?? "请输入"} />
  ),
};
