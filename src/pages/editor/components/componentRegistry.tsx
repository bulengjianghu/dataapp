import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import type { Node } from "../../../types/schema/node";

export type PropertyControlType = "input" | "textarea" | "number" | "switch" | "select" | "options";
export type PropertyFieldTarget = "props" | "layout";

export type PropertyFieldSchema = {
  key: string;
  label: string;
  target: PropertyFieldTarget;
  control: PropertyControlType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  options?: Array<{ label: string; value: number | string }>;
};

export type PropertyGroupSchema = {
  key: string;
  title: string;
  fields: PropertyFieldSchema[];
};

export type ComponentConfigDefinition = {
  key: string;
  title: string;
  createDefaultProps: () => Record<string, unknown>;
  propertyGroups: PropertyGroupSchema[];
};

const defaultLayoutGroup: PropertyGroupSchema = {
  key: "layout",
  title: "布局",
  fields: [
    {
      key: "span",
      label: "宽度",
      target: "layout",
      control: "select",
      options: [
        { label: "1/4", value: 6 },
        { label: "1/3", value: 8 },
        { label: "1/2", value: 12 },
        { label: "整行", value: 24 },
      ],
    },
    {
      key: "order",
      label: "排序",
      target: "layout",
      control: "number",
      min: 0,
      step: 1,
      placeholder: "值越小越靠前",
    },
  ],
};

const baseFieldGroup: PropertyGroupSchema = {
  key: "basic",
  title: "基础",
  fields: [
    {
      key: "label",
      label: "标题",
      target: "props",
      control: "input",
      placeholder: "请输入字段标题",
    },
    {
      key: "helpText",
      label: "帮助文案",
      target: "props",
      control: "textarea",
      rows: 3,
      placeholder: "可选，展示在字段下方",
    },
    {
      key: "required",
      label: "必填",
      target: "props",
      control: "switch",
    },
  ],
};

const containerGroup: PropertyGroupSchema = {
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
};

export const componentConfigRegistry: Record<string, ComponentConfigDefinition> = {
  input: {
    key: "input",
    title: "单行文本",
    createDefaultProps: () => ({
      component: "input",
      label: "单行文本",
      placeholder: "请输入",
      required: false,
      helpText: "",
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
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
  },
  textarea: {
    key: "textarea",
    title: "多行文本",
    createDefaultProps: () => ({
      component: "textarea",
      label: "多行文本",
      placeholder: "请输入详细内容",
      required: false,
      helpText: "",
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
        fields: [
          {
            key: "placeholder",
            label: "占位提示",
            target: "props",
            control: "textarea",
            rows: 3,
            placeholder: "请输入占位提示",
          },
        ],
      },
      defaultLayoutGroup,
    ],
  },
  number: {
    key: "number",
    title: "数字",
    createDefaultProps: () => ({
      component: "number",
      label: "数字",
      placeholder: "请输入数字",
      required: false,
      helpText: "",
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
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
  },
  date: {
    key: "date",
    title: "日期",
    createDefaultProps: () => ({
      component: "date",
      label: "日期",
      placeholder: "请选择日期",
      required: false,
      helpText: "",
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
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
  },
  radio: {
    key: "radio",
    title: "单选",
    createDefaultProps: () => ({
      component: "radio",
      label: "单选",
      required: false,
      helpText: "",
      options: [
        { label: "选项 1", value: "option-1" },
        { label: "选项 2", value: "option-2" },
      ],
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
        fields: [
          {
            key: "options",
            label: "选项",
            target: "props",
            control: "options",
            placeholder: "每行一个选项",
          },
        ],
      },
      defaultLayoutGroup,
    ],
  },
  checkbox: {
    key: "checkbox",
    title: "多选",
    createDefaultProps: () => ({
      component: "checkbox",
      label: "多选",
      required: false,
      helpText: "",
      options: [
        { label: "选项 1", value: "option-1" },
        { label: "选项 2", value: "option-2" },
      ],
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
        fields: [
          {
            key: "options",
            label: "选项",
            target: "props",
            control: "options",
            placeholder: "每行一个选项",
          },
        ],
      },
      defaultLayoutGroup,
    ],
  },
  select: {
    key: "select",
    title: "下拉",
    createDefaultProps: () => ({
      component: "select",
      label: "下拉",
      placeholder: "请选择",
      required: false,
      helpText: "",
      options: [
        { label: "选项 1", value: "option-1" },
        { label: "选项 2", value: "option-2" },
      ],
    }),
    propertyGroups: [
      baseFieldGroup,
      {
        key: "component",
        title: "组件",
        fields: [
          {
            key: "placeholder",
            label: "占位提示",
            target: "props",
            control: "input",
            placeholder: "请输入占位提示",
          },
          {
            key: "options",
            label: "选项",
            target: "props",
            control: "options",
            placeholder: "每行一个选项",
          },
        ],
      },
      defaultLayoutGroup,
    ],
  },
  upload: {
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
  },
  container: {
    key: "container",
    title: "分组容器",
    createDefaultProps: () => ({
      component: "container",
      label: "分组容器",
      description: "将字段拖入此容器中",
    }),
    propertyGroups: [containerGroup, defaultLayoutGroup],
  },
};

export function resolvePropertyGroups(node: Node): PropertyGroupSchema[] {
  if (node.type === "page") {
    return [
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
    ];
  }

  const componentKey = typeof node.props.component === "string" ? node.props.component : node.type === "container" ? "container" : "";
  return componentConfigRegistry[componentKey]?.propertyGroups ?? [defaultLayoutGroup];
}

export function getComponentTitle(componentKey: string | undefined): string {
  if (!componentKey) {
    return "未命名组件";
  }
  return componentConfigRegistry[componentKey]?.title ?? componentKey;
}

export function createPaletteNodePreset(componentKey: string) {
  const definition = componentConfigRegistry[componentKey];
  const props = definition?.createDefaultProps() ?? { component: componentKey, label: componentKey };

  return {
    type: componentKey === "container" ? ("container" as const) : ("field" as const),
    props,
    layout: {
      span: componentKey === "container" ? 24 : 12,
    },
  };
}

function normalizeOptions(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
    .map((item, index) => ({
      label: typeof item.label === "string" && item.label.trim() ? item.label : `选项 ${index + 1}`,
      value:
        typeof item.value === "string" && item.value.trim()
          ? item.value
          : `option-${index + 1}`,
    }));
}

type PreviewRenderer = (node: Node) => ReactNode;

export const componentRenderRegistry: Record<string, PreviewRenderer> = {
  input: (node) => (
    <Input
      disabled
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入"}
      value=""
    />
  ),
  textarea: (node) => (
    <Input.TextArea
      disabled
      rows={3}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入详细内容"}
      value=""
    />
  ),
  number: (node) => (
    <InputNumber
      disabled
      style={{ width: "100%" }}
      placeholder={(node.props.placeholder as string | undefined) ?? "请输入数字"}
    />
  ),
  date: (node) => (
    <DatePicker
      disabled
      style={{ width: "100%" }}
      placeholder={(node.props.placeholder as string | undefined) ?? "请选择日期"}
    />
  ),
  radio: (node) => {
    const options = normalizeOptions(node.props.options);
    return <Radio.Group options={options} />;
  },
  checkbox: (node) => {
    const options = normalizeOptions(node.props.options);
    return <Checkbox.Group options={options} />;
  },
  select: (node) => {
    const options = normalizeOptions(node.props.options);
    return (
      <Select
        disabled
        options={options}
        placeholder={(node.props.placeholder as string | undefined) ?? "请选择"}
      />
    );
  },
  upload: (node) => (
    <Space direction="vertical" size={8}>
      <Button icon={<InboxOutlined />} disabled>
        {(node.props.buttonText as string | undefined) ?? "点击上传"}
      </Button>
      <Typography.Text type="secondary">支持拖拽或点击上传附件</Typography.Text>
    </Space>
  ),
  container: (node) => (
    <Space direction="vertical" size={6}>
      <Tag color="blue">容器</Tag>
      <Typography.Text type="secondary">
        {(node.props.description as string | undefined) ?? "将字段拖入此容器中"}
      </Typography.Text>
    </Space>
  ),
};

export function renderEditorNodePreview(node: Node): ReactNode {
  const componentKey = typeof node.props.component === "string" ? node.props.component : node.type === "container" ? "container" : "";
  const renderer = componentRenderRegistry[componentKey];
  if (!renderer) {
    return <Typography.Text type="secondary">暂不支持该组件预览</Typography.Text>;
  }
  return renderer(node);
}
