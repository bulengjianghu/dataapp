import { Input } from "antd";

export function TextareaFieldContent({
  placeholder,
  interactive,
  rows = 3,
}: {
  placeholder: string;
  interactive: boolean;
  rows?: number;
}) {
  return <Input.TextArea disabled={!interactive} rows={rows} placeholder={placeholder} value="" />;
}
