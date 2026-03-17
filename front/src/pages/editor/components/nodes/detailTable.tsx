import { Space, Table, Tag, Typography } from "antd";
import type { ComponentNodeDefinition } from "./types";

export const detailTableNodeDefinition: ComponentNodeDefinition = {
  key: "detail-table",
  title: "明细表",
  createDefaultProps: () => ({
    component: "detail-table",
    title: "明细表",
    description: "将字段拖入明细表中形成列",
    minRows: 0,
    maxRows: 200,
    allowAddRow: true,
    allowDeleteRow: true,
    defaultRowCount: 1,
  }),
  propertyGroups: [
    {
      key: "detail-table-basic",
      title: "明细表",
      fields: [
        {
          key: "title",
          label: "标题",
          target: "props",
          control: "input",
          placeholder: "请输入明细表标题",
        },
        {
          key: "description",
          label: "说明",
          target: "props",
          control: "textarea",
          rows: 3,
          placeholder: "展示在明细表头部的说明文案",
        },
      ],
    },
    {
      key: "detail-table-rules",
      title: "行规则",
      fields: [
        {
          key: "minRows",
          label: "最小行数",
          target: "props",
          control: "number",
          min: 0,
          step: 1,
        },
        {
          key: "maxRows",
          label: "最大行数",
          target: "props",
          control: "number",
          min: 1,
          step: 1,
        },
        {
          key: "defaultRowCount",
          label: "默认行数",
          target: "props",
          control: "number",
          min: 0,
          step: 1,
        },
        {
          key: "allowAddRow",
          label: "允许新增行",
          target: "props",
          control: "switch",
        },
        {
          key: "allowDeleteRow",
          label: "允许删除行",
          target: "props",
          control: "switch",
        },
      ],
    },
  ],
  renderContent: (node) => (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space>
        <Tag color="cyan">明细表</Tag>
        <Typography.Text strong>{(node.props.title as string | undefined) ?? "明细表"}</Typography.Text>
      </Space>
      <Typography.Text type="secondary">
        {(node.props.description as string | undefined) ?? "将字段拖入明细表中形成列"}
      </Typography.Text>
      <Table
        size="small"
        pagination={false}
        columns={[
          {
            title: "列字段",
            dataIndex: "name",
            render: (_, __, index) => `第 ${index + 1} 列`,
          },
          {
            title: "列宽",
            dataIndex: "width",
            render: () => "自动",
          },
        ]}
        dataSource={[{ key: "preview" }]}
      />
    </Space>
  ),
};
