import { Card, Empty } from "antd";

export function PropertyPanel() {
  return (
    <Card title="属性面板" size="small">
      <div
        style={{
          minHeight: "calc(100vh - 180px)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Empty description="Sprint 1 占位：未选择组件" />
      </div>
    </Card>
  );
}
