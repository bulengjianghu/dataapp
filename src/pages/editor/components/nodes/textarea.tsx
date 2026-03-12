import { Input } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const textareaNodeDefinition: ComponentNodeDefinition = {
  key: "textarea",
  title: "多行文本",
  createDefaultProps: () => ({
    component: "textarea",
    label: "多行文本",
    placeholder: "请输入详细内容",
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
          control: "textarea",
          rows: 3,
          placeholder: "请输入占位提示",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderEditorPreview: (node) => (
    <Input.TextArea
      disabled
      rows={3}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入详细内容"}
      value=""
    />
  ),
  renderRuntime: (node) => (
    <Input.TextArea
      rows={3}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入详细内容"}
    />
  ),
};
