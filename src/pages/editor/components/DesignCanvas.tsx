import { Card, Empty } from "antd";

export function DesignCanvas() {
  return (
    <Card title="设计画布" size="small" style={{ height: "100%" }}>
      <div
        style={{
          height: "calc(100vh - 140px)",
          minHeight: 360,
          display: "grid",
          placeItems: "center",
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          background: "#ffffff",
        }}
      >
        <Empty description="Sprint 1 占位：空画布" />
      </div>
    </Card>
  );
}
