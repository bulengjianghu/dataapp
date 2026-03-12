import { Checkbox } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup, normalizeOptions } from "./shared";

export const checkboxNodeDefinition: ComponentNodeDefinition = {
  key: "checkbox",
  title: "多选",
  createDefaultProps: () => ({
    component: "checkbox",
    label: "多选",
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
  renderEditorPreview: (node) => <Checkbox.Group options={normalizeOptions(node.props.options)} />,
};
