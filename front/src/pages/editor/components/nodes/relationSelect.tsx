import { LinkOutlined } from "@ant-design/icons";
import { Button, Space, Tag, Typography } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const relationSelectNodeDefinition: ComponentNodeDefinition = {
  key: "relation-select",
  title: "关联选择",
  createDefaultProps: () => ({
    component: "relation-select",
    label: "关联选择",
    placeholder: "请选择关联记录",
    required: false,
    helpText: "",
    sourceFormId: "",
    displayFields: [],
    selectedDisplayField: "",
    filters: [],
    mappings: [],
  }),
  propertyGroups: [
    baseFieldGroup,
    {
      key: "relation-select-basic",
      title: "关联配置",
      fields: [
        {
          key: "sourceFormId",
          label: "来源表单",
          target: "props",
          control: "select",
          placeholder: "请选择来源表单",
          options: [],
        },
        {
          key: "displayFields",
          label: "列表展示字段",
          target: "props",
          control: "relation-display-fields",
        },
        {
          key: "selectedDisplayField",
          label: "选中展示字段",
          target: "props",
          control: "relation-selected-display-field",
        },
        {
          key: "filters",
          label: "筛选条件",
          target: "props",
          control: "relation-filters",
        },
        {
          key: "mappings",
          label: "回填映射",
          target: "props",
          control: "relation-mappings",
        },
      ],
    },
    {
      key: "relation-select-display",
      title: "展示",
      fields: [
        {
          key: "placeholder",
          label: "占位提示",
          target: "props",
          control: "input",
          placeholder: "请输入占位提示",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderContent: (node) => (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space>
        <Tag color="geekblue">关联选择</Tag>
        {typeof node.props.sourceFormId === "string" && node.props.sourceFormId ? (
          <Typography.Text type="secondary">来源表单 #{node.props.sourceFormId}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">未配置来源表单</Typography.Text>
        )}
      </Space>
      <Button icon={<LinkOutlined />} block>
        {typeof node.props.placeholder === "string" && node.props.placeholder
          ? node.props.placeholder
          : "请选择关联记录"}
      </Button>
    </Space>
  ),
};
