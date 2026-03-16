import { Alert, Checkbox, Empty, Flex, Input, InputNumber, Select, Typography } from "antd";
import type { CheckboxGroupProps } from "antd/es/checkbox";
import type { DefaultOptionType } from "antd/es/select";
import type { Node, NodesById } from "../../../types/schema/node";
import { ContainerLayout } from "../../editor/components/formDesign/shared/ContainerLayout";

function toCheckboxOptions(options: unknown): CheckboxGroupProps<string>["options"] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
    .map((item, index) => ({
      label: typeof item.label === "string" && item.label.trim() ? item.label : `选项 ${index + 1}`,
      value: typeof item.value === "string" ? item.value : `option-${index + 1}`,
    }));
}

function toSelectOptions(options: unknown): DefaultOptionType[] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
    .map((item, index) => ({
      label: typeof item.label === "string" && item.label.trim() ? item.label : `选项 ${index + 1}`,
      value: typeof item.value === "string" ? item.value : `option-${index + 1}`,
    }));
}

function renderFieldInput(
  node: Node,
  value: unknown,
  disabled: boolean,
  onChange: (nextValue: unknown) => void
) {
  const component = typeof node.props.component === "string" ? node.props.component : "";
  const placeholder = typeof node.props.placeholder === "string" ? node.props.placeholder : undefined;

  switch (component) {
    case "input":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "textarea":
      return (
        <Input.TextArea
          value={typeof value === "string" ? value : ""}
          rows={4}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <InputNumber
          value={typeof value === "number" ? value : undefined}
          placeholder={placeholder}
          disabled={disabled}
          style={{ width: "100%" }}
          onChange={(nextValue) => onChange(nextValue ?? undefined)}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "radio":
    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : undefined}
          placeholder={placeholder || "请选择"}
          disabled={disabled}
          options={toSelectOptions(node.props.options)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      );
    case "checkbox":
      return (
        <Checkbox.Group
          value={Array.isArray(value) ? (value as string[]) : []}
          disabled={disabled}
          options={toCheckboxOptions(node.props.options)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      );
    case "upload":
      return <Alert type="info" showIcon message="附件上传暂未接入后端，本页先保留字段占位。" />;
    default:
      return <Alert type="warning" showIcon message={`暂不支持组件：${component || node.id}`} />;
  }
}

function RuntimeFillNode({
  node,
  nodesById,
  data,
  disabled,
  onValueChange,
}: {
  node: Node;
  nodesById: NodesById;
  data: Record<string, unknown>;
  disabled: boolean;
  onValueChange: (fieldKey: string, value: unknown) => void;
}) {
  if (node.type === "container") {
    return (
      <ContainerLayout hasChildren={node.childrenIds.length > 0} emptyText="容器暂无字段" emptyFallback={<Empty description="容器暂无字段" />}>
        {node.childrenIds.map((childId) => {
          const childNode = nodesById[childId];
          if (!childNode) {
            return null;
          }
          const span = typeof childNode.layout.span === "number" ? Math.max(6, Math.min(24, childNode.layout.span)) : 24;
          return (
            <div key={childId} style={{ gridColumn: `span ${span}` }}>
              <RuntimeFillNode node={childNode} nodesById={nodesById} data={data} disabled={disabled} onValueChange={onValueChange} />
            </div>
          );
        })}
      </ContainerLayout>
    );
  }

  if (node.type !== "field") {
    return null;
  }

  const fieldKey = typeof node.serverId === "string" ? node.serverId : "";
  const label = typeof node.props.label === "string" ? node.props.label : node.id;
  const helpText = typeof node.props.helpText === "string" ? node.props.helpText : "";

  return (
    <Flex vertical gap={8}>
      <Typography.Text strong>
        {Boolean(node.props.required) ? <span className="runtime-node__required">*</span> : null}
        {label}
      </Typography.Text>
      {renderFieldInput(node, data[fieldKey], disabled, (nextValue) => onValueChange(fieldKey, nextValue))}
      {helpText ? <Typography.Text type="secondary">{helpText}</Typography.Text> : null}
    </Flex>
  );
}

export function RecordFormCanvas({
  nodesById,
  pageChildren,
  data,
  readonly,
  onValueChange,
}: {
  nodesById: NodesById;
  pageChildren: string[];
  data: Record<string, unknown>;
  readonly: boolean;
  onValueChange: (fieldKey: string, value: unknown) => void;
}) {
  return (
    <ContainerLayout hasChildren={pageChildren.length > 0} emptyText="页面暂无字段" emptyFallback={<Empty description="页面暂无字段" />}>
      {pageChildren.map((childId) => {
        const childNode = nodesById[childId];
        if (!childNode) {
          return null;
        }
        const span = typeof childNode.layout.span === "number" ? Math.max(6, Math.min(24, childNode.layout.span)) : 24;
        return (
          <div key={childId} style={{ gridColumn: `span ${span}` }}>
            <RuntimeFillNode node={childNode} nodesById={nodesById} data={data} disabled={readonly} onValueChange={onValueChange} />
          </div>
        );
      })}
    </ContainerLayout>
  );
}
