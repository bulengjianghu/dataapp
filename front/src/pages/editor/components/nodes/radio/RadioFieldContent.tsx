import { Radio } from "antd";

export function RadioFieldContent({
  options,
  interactive,
}: {
  options: Array<{ label: string; value: string }>;
  interactive: boolean;
}) {
  return <Radio.Group options={options} disabled={!interactive} />;
}
