import { Card } from "antd";
import { FormEditorRenderer } from "./FormEditorRenderer";

export function DesignCanvas() {
  return (
    <Card
      title="设计画布"
      size="small"
      style={{ height: "100%" }}
      bodyStyle={{ height: "calc(100% - 38px)", padding: 0 }}
    >
      <div
        style={{
          height: "100%",
          minHeight: 360,
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          background: "#ffffff",
          overflow: "auto",
        }}
      >
        <div style={{ width: "100%", minHeight: "100%", padding: 16, boxSizing: "border-box" }}>
          <FormEditorRenderer />
        </div>
      </div>
    </Card>
  );
}
