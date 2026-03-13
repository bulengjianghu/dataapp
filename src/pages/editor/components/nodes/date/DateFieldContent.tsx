import { DatePicker } from "antd";

export function DateFieldContent({
  placeholder,
  interactive,
}: {
  placeholder: string;
  interactive: boolean;
}) {
  return <DatePicker disabled={!interactive} style={{ width: "100%" }} placeholder={placeholder} />;
}
