import { Checkbox } from "antd";

export function CheckboxFieldContent({
  options,
  interactive,
}: {
  options: Array<{ label: string; value: string }>;
  interactive: boolean;
}) {
  return <Checkbox.Group options={options} disabled={!interactive} />;
}
