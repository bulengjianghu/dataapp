import { Card, List, Space, Tag, Typography } from "antd";

type PaletteCategory = "基础字段" | "选项字段" | "附件" | "容器入口";

type PaletteItem = {
  key: string;
  label: string;
  category: PaletteCategory;
};

const paletteItems: PaletteItem[] = [
  { key: "input", label: "单行文本", category: "基础字段" },
  { key: "textarea", label: "多行文本", category: "基础字段" },
  { key: "number", label: "数字", category: "基础字段" },
  { key: "date", label: "日期", category: "基础字段" },
  { key: "radio", label: "单选", category: "选项字段" },
  { key: "checkbox", label: "多选", category: "选项字段" },
  { key: "select", label: "下拉", category: "选项字段" },
  { key: "upload", label: "附件上传", category: "附件" },
  { key: "container", label: "分组容器", category: "容器入口" },
];

const categories: PaletteCategory[] = ["基础字段", "选项字段", "附件", "容器入口"];

export function ComponentPalette() {
  return (
    <Card title="组件面板" size="small">
      <Typography.Paragraph type="secondary">
        Sprint 1 先提供分组入口，Sprint 2 接入拖拽投放。
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {categories.map((category) => {
          const group = paletteItems.filter((item) => item.category === category);
          return (
            <Card key={category} size="small" title={category}>
              <List
                size="small"
                bordered
                dataSource={group}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      <span>{item.label}</span>
                      <Tag>{item.key}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          );
        })}
      </Space>
    </Card>
  );
}
