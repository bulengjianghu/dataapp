import { Space, Tag, Typography } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { defaultLayoutGroup } from "./shared";

export const containerNodeDefinition: ComponentNodeDefinition = {
  key: "container",
  title: "分组容器",
  createDefaultProps: () => ({
    component: "container",
    label: "分组容器",
    description: "将字段拖入此容器中",
  }),
  propertyGroups: [
    {
      key: "container-basic",
      title: "容器",
      fields: [
        {
          key: "label",
          label: "标题",
          target: "props",
          control: "input",
          placeholder: "请输入容器标题",
        },
        {
          key: "description",
          label: "说明",
          target: "props",
          control: "textarea",
          rows: 3,
          placeholder: "展示在容器标题下方",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderEditorPreview: (node) => (
    <Space direction="vertical" size={6}>
      <Tag color="blue">容器</Tag>
      <Typography.Text type="secondary">
        {(node.props.description as string | undefined) ?? "将字段拖入此容器中"}
      </Typography.Text>
    </Space>
  ),
};
