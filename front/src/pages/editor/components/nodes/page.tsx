import { Typography } from "antd";
import type { ComponentNodeDefinition } from "./types";

export const pageNodeDefinition: ComponentNodeDefinition = {
  key: "page",
  title: "页面",
  canvasTitle: "设计画布",
  emptyText: "空画布：请从左侧组件面板添加组件",
  createDefaultProps: () => ({
    title: "未命名表单",
    description: "",
  }),
  propertyGroups: [
    {
      key: "page",
      title: "页面",
      fields: [
        {
          key: "title",
          label: "标题",
          target: "props",
          control: "input",
          placeholder: "请输入页面标题",
        },
        {
          key: "description",
          label: "说明",
          target: "props",
          control: "textarea",
          rows: 3,
          placeholder: "请输入页面说明",
        },
      ],
    },
  ],
  renderContent: (node, mode) => (
    <Typography.Text type="secondary">
      {(node.props.description as string | undefined) || (mode === "editor" ? "页面根节点用于承载整个表单画布" : "请填写表单内容")}
    </Typography.Text>
  ),
};
