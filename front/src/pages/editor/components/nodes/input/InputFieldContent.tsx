import { Input } from "antd";

export function InputFieldContent({
  placeholder,
  interactive,
}: {
  placeholder: string;
  interactive: boolean;
}) {
  return <Input disabled={!interactive} placeholder={placeholder} value="" />;
}
