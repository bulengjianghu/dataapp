import { InputNumber } from "antd";
import type { ClipboardEvent, KeyboardEvent } from "react";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

function isAllowedNumberKey(event: KeyboardEvent<HTMLInputElement>) {
  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    ".",
    "-",
  ]);

  if (event.ctrlKey || event.metaKey) {
    return true;
  }

  return allowedKeys.has(event.key) || /^\d$/.test(event.key);
}

function handleNumberKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (!isAllowedNumberKey(event)) {
    event.preventDefault();
  }
}

function handleNumberPaste(event: ClipboardEvent<HTMLInputElement>) {
  const text = event.clipboardData.getData("text");
  if (!/^-?\d*\.?\d*$/.test(text)) {
    event.preventDefault();
  }
}

const numberInputProps = {
  style: { width: "100%" },
  stringMode: false as const,
  controls: false,
  inputMode: "decimal" as const,
  parser: (value?: string) => {
    if (!value) {
      return "";
    }
    return value.replace(/[^\d.-]/g, "");
  },
  onKeyDown: handleNumberKeyDown,
  onPaste: handleNumberPaste,
};

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
      {...numberInputProps}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入数字"}
    />
  ),
  renderRuntime: (node) => (
    <InputNumber
      {...numberInputProps}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入数字"}
    />
  ),
};
