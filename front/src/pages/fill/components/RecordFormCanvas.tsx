import { DeleteOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, Empty, Flex, Input, InputNumber, Select, Space, Table, Tag, Typography } from "antd";
import type { CheckboxGroupProps } from "antd/es/checkbox";
import type { ColumnsType } from "antd/es/table";
import type { Node, NodesById } from "../../../types/schema/node";
import type { BaseFieldState } from "../../../store/slices/interactionRuntimeSlice";
import { ContainerLayout } from "../../editor/components/formDesign/shared/ContainerLayout";
import type { RecordRuntimeData } from "../services/recordRuntime";

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

function toSelectOptions(options: unknown): Array<{ label: string; value: string }> {
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

function getFieldLabel(node: Node) {
  return typeof node.props.label === "string" ? node.props.label : node.id;
}

function getFieldKey(node: Node) {
  return typeof node.serverId === "string" ? node.serverId : "";
}

function renderFieldInput(
  node: Node,
  fieldState: BaseFieldState | undefined,
  value: unknown,
  displayValue: string | undefined,
  disabled: boolean,
  onChange: (nextValue: unknown) => void,
  onOpenRelationSelect: () => void
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
          options={fieldState?.select?.options?.length ? fieldState.select.options : toSelectOptions(node.props.options)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      );
    case "checkbox":
      return (
        <Checkbox.Group
          value={Array.isArray(value) ? (value as string[]) : []}
          disabled={disabled}
          options={fieldState?.select?.options?.length ? fieldState.select.options : toCheckboxOptions(node.props.options)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      );
    case "upload":
      return <Alert type="info" showIcon message="附件上传暂未接入后端，本页先保留字段占位。" />;
    case "relation-select":
      return (
        <Space.Compact style={{ width: "100%" }}>
          <Input
            readOnly
            disabled={disabled}
            value={displayValue ?? (typeof value === "string" || typeof value === "number" ? String(value) : "")}
            placeholder={placeholder || "请选择关联记录"}
          />
          <Button icon={<LinkOutlined />} disabled={disabled} onClick={onOpenRelationSelect}>
            选择
          </Button>
        </Space.Compact>
      );
    default:
      return <Alert type="warning" showIcon message={`暂不支持组件：${component || node.id}`} />;
  }
}

function MainFieldRenderer({
  node,
  data,
  fieldState,
  validationErrors,
  readonly,
  onMainValueChange,
  onOpenRelationSelect,
  getRelationDisplayValue,
}: {
  node: Node;
  data: Record<string, unknown>;
  fieldState?: BaseFieldState;
  validationErrors?: string[];
  readonly: boolean;
  onMainValueChange: (fieldKey: string, value: unknown) => void;
  onOpenRelationSelect: (node: Node) => void;
  getRelationDisplayValue: (node: Node) => string | undefined;
}) {
  const fieldKey = getFieldKey(node);
  const label = getFieldLabel(node);
  const helpText = fieldState?.hint ?? (typeof node.props.helpText === "string" ? node.props.helpText : "");
  const visible = fieldState?.visible ?? true;
  const disabled = readonly || fieldState?.readonly === true || fieldState?.disabled === true;
  const required = fieldState?.required ?? Boolean(node.props.required);

  if (!visible) {
    return null;
  }

  return (
    <Flex vertical gap={8}>
      <Typography.Text strong>
        {required ? <span className="runtime-node__required">*</span> : null}
        {label}
      </Typography.Text>
      {renderFieldInput(
        node,
        fieldState,
        data[fieldKey],
        getRelationDisplayValue(node),
        disabled,
        (nextValue) => onMainValueChange(fieldKey, nextValue),
        () => onOpenRelationSelect(node)
      )}
      {helpText ? <Typography.Text type="secondary">{helpText}</Typography.Text> : null}
      {validationErrors?.map((message) => (
        <Typography.Text key={message} type="danger">
          {message}
        </Typography.Text>
      ))}
    </Flex>
  );
}

function DetailTableRuntimeBlock({
  node,
  nodesById,
  data,
  readonly,
  onAddDetailRow,
  onRemoveDetailRow,
  onDetailValueChange,
  onOpenRelationSelect,
  getRelationDisplayValue,
  fieldStates,
  validationErrors,
}: {
  node: Node;
  nodesById: NodesById;
  data: RecordRuntimeData;
  readonly: boolean;
  onAddDetailRow: (detailTableKey: string, columnNodes: Node[], defaultRowCount: number) => void;
  onRemoveDetailRow: (detailTableKey: string, rowIndex: number) => void;
  onDetailValueChange: (detailTableKey: string, rowIndex: number, fieldKey: string, value: unknown) => void;
  onOpenRelationSelect: (node: Node, detailTableKey: string, rowIndex: number) => void;
  getRelationDisplayValue: (node: Node, detailTableKey: string, rowIndex: number) => string | undefined;
  fieldStates: Record<string, BaseFieldState>;
  validationErrors: Record<string, string[]>;
}) {
  const detailTableKey = getFieldKey(node);
  const title = (node.props.title as string | undefined) ?? "明细表";
  const allowAddRow = node.props.allowAddRow !== false;
  const allowDeleteRow = node.props.allowDeleteRow !== false;
  const defaultRowCount = typeof node.props.defaultRowCount === "number" ? node.props.defaultRowCount : 1;
  const columnNodes = node.childrenIds.map((childId) => nodesById[childId]).filter((child): child is Node => Boolean(child));
  const rows = data.detailTables[detailTableKey] ?? [];

  const columns: ColumnsType<Record<string, unknown>> = [
    ...columnNodes.map((columnNode): ColumnsType<Record<string, unknown>>[number] => {
      const fieldKey = getFieldKey(columnNode);
      const rawWidth = typeof columnNode.props.columnWidth === "number" ? columnNode.props.columnWidth : undefined;
      return {
        title: getFieldLabel(columnNode),
        dataIndex: fieldKey,
        key: fieldKey,
        width: rawWidth,
        render: (_, __, rowIndex) =>
          renderFieldInput(
            columnNode,
            fieldStates[fieldKey],
            rows[rowIndex]?.[fieldKey],
            getRelationDisplayValue(columnNode, detailTableKey, rowIndex),
            readonly,
            (nextValue: unknown) => onDetailValueChange(detailTableKey, rowIndex, fieldKey, nextValue),
            () => onOpenRelationSelect(columnNode, detailTableKey, rowIndex)
          ),
      };
    }),
  ];

  if (!readonly && allowDeleteRow) {
    columns.push({
      title: "操作",
      key: "actions",
      width: 88,
      render: (_, __, rowIndex) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemoveDetailRow(detailTableKey, rowIndex)}
        />
      ),
    });
  }

  const dataSource = rows.map((row, index) => ({
    key: `${detailTableKey}-${index}`,
    ...row,
  }));

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>{title}</span>
          <Tag color="cyan">明细表</Tag>
        </Space>
      }
      extra={
        !readonly && allowAddRow ? (
          <Button icon={<PlusOutlined />} size="small" onClick={() => onAddDetailRow(detailTableKey, columnNodes, defaultRowCount)}>
            新增行
          </Button>
        ) : null
      }
      bodyStyle={{ paddingTop: 12 }}
    >
      <Flex vertical gap={12}>
        <Table
          size="small"
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={columns}
          dataSource={dataSource}
          locale={{ emptyText: <Empty description="暂无明细数据" /> }}
        />
      </Flex>
    </Card>
  );
}

function RuntimeFillNode({
  node,
  nodesById,
  data,
  readonly,
  onMainValueChange,
  onAddDetailRow,
  onRemoveDetailRow,
  onDetailValueChange,
  onOpenRelationSelect,
  getRelationDisplayValue,
  fieldStates,
  validationErrors,
}: {
  node: Node;
  nodesById: NodesById;
  data: RecordRuntimeData;
  readonly: boolean;
  onMainValueChange: (fieldKey: string, value: unknown) => void;
  onAddDetailRow: (detailTableKey: string, columnNodes: Node[], defaultRowCount: number) => void;
  onRemoveDetailRow: (detailTableKey: string, rowIndex: number) => void;
  onDetailValueChange: (detailTableKey: string, rowIndex: number, fieldKey: string, value: unknown) => void;
  onOpenRelationSelect: (node: Node, detailTableKey?: string, rowIndex?: number) => void;
  getRelationDisplayValue: (node: Node, detailTableKey?: string, rowIndex?: number) => string | undefined;
  fieldStates: Record<string, BaseFieldState>;
  validationErrors: Record<string, string[]>;
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
              <RuntimeFillNode
                node={childNode}
                nodesById={nodesById}
                data={data}
                readonly={readonly}
                onMainValueChange={onMainValueChange}
                onAddDetailRow={onAddDetailRow}
                onRemoveDetailRow={onRemoveDetailRow}
                onDetailValueChange={onDetailValueChange}
                onOpenRelationSelect={onOpenRelationSelect}
                getRelationDisplayValue={getRelationDisplayValue}
                fieldStates={fieldStates}
                validationErrors={validationErrors}
              />
            </div>
          );
        })}
      </ContainerLayout>
    );
  }

  if (node.type === "detail_table") {
    return (
      <DetailTableRuntimeBlock
        node={node}
        nodesById={nodesById}
        data={data}
        readonly={readonly}
        onAddDetailRow={onAddDetailRow}
        onRemoveDetailRow={onRemoveDetailRow}
        onDetailValueChange={onDetailValueChange}
        onOpenRelationSelect={(relationNode, detailTableKey, rowIndex) => onOpenRelationSelect(relationNode, detailTableKey, rowIndex)}
        getRelationDisplayValue={(relationNode, detailTableKey, rowIndex) => getRelationDisplayValue(relationNode, detailTableKey, rowIndex)}
        fieldStates={fieldStates}
        validationErrors={validationErrors}
      />
    );
  }

  if (node.type !== "field") {
    return null;
  }

  return (
    <MainFieldRenderer
      node={node}
      data={data.mainData}
      fieldState={fieldStates[getFieldKey(node)]}
      validationErrors={validationErrors[getFieldKey(node)]}
      readonly={readonly}
      onMainValueChange={onMainValueChange}
      onOpenRelationSelect={(relationNode) => onOpenRelationSelect(relationNode)}
      getRelationDisplayValue={(relationNode) => getRelationDisplayValue(relationNode)}
    />
  );
}

export function RecordFormCanvas({
  nodesById,
  pageChildren,
  data,
  readonly,
  onMainValueChange,
  onAddDetailRow,
  onRemoveDetailRow,
  onDetailValueChange,
  onOpenRelationSelect,
  getRelationDisplayValue,
  fieldStates = {},
  validationErrors = {},
}: {
  nodesById: NodesById;
  pageChildren: string[];
  data: RecordRuntimeData;
  readonly: boolean;
  onMainValueChange: (fieldKey: string, value: unknown) => void;
  onAddDetailRow: (detailTableKey: string, columnNodes: Node[], defaultRowCount: number) => void;
  onRemoveDetailRow: (detailTableKey: string, rowIndex: number) => void;
  onDetailValueChange: (detailTableKey: string, rowIndex: number, fieldKey: string, value: unknown) => void;
  onOpenRelationSelect: (node: Node, detailTableKey?: string, rowIndex?: number) => void;
  getRelationDisplayValue: (node: Node, detailTableKey?: string, rowIndex?: number) => string | undefined;
  fieldStates?: Record<string, BaseFieldState>;
  validationErrors?: Record<string, string[]>;
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
            <RuntimeFillNode
              node={childNode}
              nodesById={nodesById}
              data={data}
              readonly={readonly}
              onMainValueChange={onMainValueChange}
              onAddDetailRow={onAddDetailRow}
              onRemoveDetailRow={onRemoveDetailRow}
              onDetailValueChange={onDetailValueChange}
              onOpenRelationSelect={onOpenRelationSelect}
              getRelationDisplayValue={getRelationDisplayValue}
              fieldStates={fieldStates}
              validationErrors={validationErrors}
            />
          </div>
        );
      })}
    </ContainerLayout>
  );
}
