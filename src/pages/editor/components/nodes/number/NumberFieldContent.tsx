import { InputNumber } from "antd";
import type { ClipboardEvent, KeyboardEvent } from "react";

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

export function NumberFieldContent({
  placeholder,
  interactive,
}: {
  placeholder: string;
  interactive: boolean;
}) {
  return <InputNumber {...numberInputProps} disabled={!interactive} placeholder={placeholder} />;
}
