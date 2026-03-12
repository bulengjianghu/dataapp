import { InboxOutlined } from "@ant-design/icons";
import { Button, Space, Typography, Upload } from "antd";
import type { ComponentNodeDefinition } from "./types";
import { baseFieldGroup, defaultLayoutGroup } from "./shared";

export const uploadNodeDefinition: ComponentNodeDefinition = {
  key: "upload",
  title: "附件上传",
  createDefaultProps: () => ({
    component: "upload",
    label: "附件上传",
    required: false,
    helpText: "",
    buttonText: "点击上传",
  }),
  propertyGroups: [
    baseFieldGroup,
    {
      key: "component",
      title: "组件",
      fields: [
        {
          key: "buttonText",
          label: "按钮文案",
          target: "props",
          control: "input",
          placeholder: "请输入按钮文案",
        },
      ],
    },
    defaultLayoutGroup,
  ],
  renderEditorPreview: (node) => (
    <Space direction="vertical" size={8}>
      <Button icon={<InboxOutlined />} disabled>
        {(node.props.buttonText as string | undefined) ?? "点击上传"}
      </Button>
      <Typography.Text type="secondary">支持拖拽或点击上传附件</Typography.Text>
    </Space>
  ),
  renderRuntime: (node) => (
    <Upload beforeUpload={() => false} showUploadList={false}>
      <Button icon={<InboxOutlined />}>
        {(node.props.buttonText as string | undefined) ?? "点击上传"}
      </Button>
    </Upload>
  ),
};
