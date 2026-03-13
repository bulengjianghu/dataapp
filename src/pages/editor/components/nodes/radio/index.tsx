import type { ComponentNodeDefinition } from "../types";
import { baseFieldGroup, defaultLayoutGroup, normalizeOptions } from "../shared";
import { RadioFieldContent } from "./RadioFieldContent";

export const radioNodeDefinition: ComponentNodeDefinition = {
  key: "radio",
  title: "单选",
  createDefaultProps: () => ({
    component: "radio",
    label: "单选",
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
  renderContent: (node, mode) => (
    <RadioFieldContent options={normalizeOptions(node.props.options)} interactive={mode === "runtime"} />
  ),
};
