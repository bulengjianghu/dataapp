import { Card, List, Typography } from "antd";

const items = ["单行文本", "多行文本", "数字", "日期", "单选", "多选", "下拉", "附件", "分组容器"];

export function ComponentPalette() {
  return (
    <Card title="组件面板" size="small">
      <Typography.Paragraph type="secondary">
        Sprint 1 占位：后续接入拖拽与组件模板。
      </Typography.Paragraph>
      <List
        size="small"
        bordered
        dataSource={items}
        renderItem={(item) => <List.Item>{item}</List.Item>}
      />
    </Card>
  );
}
