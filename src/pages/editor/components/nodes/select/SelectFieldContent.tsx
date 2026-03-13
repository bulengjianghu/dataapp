import { Select } from "antd";

export function SelectFieldContent({
  placeholder,
  options,
  interactive,
}: {
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  interactive: boolean;
}) {
  return <Select disabled={!interactive} options={options} placeholder={placeholder} />;
}
