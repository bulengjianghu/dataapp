import { DeleteOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { Alert, AutoComplete, Button, Card, Empty, Flex, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleNodeData,
  type InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";
import type { Node, NodesById } from "../../../types/schema/node";
import { listDraftFormsOnServer, type DraftFormSummary } from "../../forms/services/formList";
import { loadDraftFromServer } from "../../editor/services/formPersistence";
import {
  loadInteractionRuleFieldOptions,
  type RuleFormFieldOption,
} from "../services/interactionRuleFormFields";
import { INTERACTION_EVENT_TYPE_OPTIONS } from "../services/interactionRuleEvents";

type RuleNodePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
};

type SelectOption = {
  label: string;
  value: string;
};

type QueryFilterDraftRow = {
  id: string;
  fieldKey: string;
  operator: string;
  valueMode: "literal" | "variable";
  literalValue: string;
  valueFrom: string;
};

type TransformMappingDraftRow = {
  id: string;
  sourceField: string;
  targetField: string;
};

const COMMAND_OPTIONS = [
  { label: "设置值", value: "setValue" },
  { label: "清空值", value: "clearValue" },
  { label: "设置显示", value: "setVisible" },
  { label: "设置只读", value: "setReadonly" },
  { label: "设置必填", value: "setRequired" },
  { label: "设置选项", value: "setOptions" },
  { label: "设置筛选条件", value: "setFilter" },
  { label: "追加明细行", value: "appendRow" },
  { label: "更新明细行", value: "updateRow" },
  { label: "替换明细表", value: "replaceTable" },
];

const QUERY_SOURCE_OPTIONS = [
  { label: "目标表单记录", value: "relation_records" },
  { label: "当前明细表行", value: "detail_rows" },
  { label: "当前字段/变量", value: "runtime_value" },
];

const QUERY_FILTER_OPERATOR_OPTIONS = [
  { label: "等于", value: "eq" },
  { label: "包含", value: "contains" },
];

const TRANSFORM_TYPE_OPTIONS = [
  { label: "直接透传/表达式", value: "expression" },
  { label: "转候选项", value: "option_mapping" },
  { label: "聚合", value: "aggregate" },
  { label: "字段映射", value: "field_mapping" },
  { label: "过滤", value: "filter" },
  { label: "排序", value: "sort" },
];

const AGGREGATE_FN_OPTIONS = [
  { label: "求和", value: "sum" },
  { label: "计数", value: "count" },
  { label: "最大值", value: "max" },
  { label: "最小值", value: "min" },
];

function createRowId() {
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

function isFieldNode(node: Node) {
  return node.type === "field";
}

function getNodeLabel(node: Node) {
  if (typeof node.props.label === "string" && node.props.label.trim()) {
    return node.props.label.trim();
  }
  if (typeof node.props.title === "string" && node.props.title.trim()) {
    return node.props.title.trim();
  }
  return node.id;
}

function getComponentTypeLabel(component: string | undefined) {
  switch (component) {
    case "input":
      return "文本";
    case "textarea":
      return "多行文本";
    case "number":
      return "数字";
    case "select":
      return "下拉";
    case "radio":
      return "单选";
    case "checkbox":
      return "复选";
    case "relation-select":
      return "关联选择";
    case "date":
      return "日期";
    default:
      return "字段";
  }
}

function normalizeStringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function normalizeQuerySourceType(nodeData: Record<string, unknown> | undefined) {
  return typeof nodeData?.sourceType === "string" && nodeData.sourceType.trim()
    ? nodeData.sourceType
    : "relation_records";
}

function buildSourceFieldOptions(nodesById: NodesById) {
  return Object.values(nodesById)
    .filter((node) => isFieldNode(node))
    .map((node) => {
      const value =
        typeof node.serverId === "string" && node.serverId.trim()
          ? node.serverId.trim()
          : node.id;
      const component = typeof node.props.component === "string" ? node.props.component : undefined;
      return {
        label: `${getComponentTypeLabel(component)} · ${getNodeLabel(node)} · ${value}`,
        value,
      } satisfies SelectOption;
    })
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeTransformMappings(value: unknown): TransformMappingDraftRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: createRowId(),
      sourceField:
        typeof item.sourceField === "string"
          ? item.sourceField
          : typeof item.targetFieldKey === "string"
            ? item.targetFieldKey
            : "",
      targetField:
        typeof item.targetField === "string"
          ? item.targetField
          : typeof item.currentFieldKey === "string"
            ? item.currentFieldKey
            : "",
    }));
}

function serializeTransformMappings(rows: TransformMappingDraftRow[]) {
  return rows
    .filter((row) => row.sourceField.trim() && row.targetField.trim())
    .map((row) => ({
      sourceField: row.sourceField,
      targetField: row.targetField,
    }));
}

function normalizeQueryFilterRows(value: unknown): QueryFilterDraftRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: createRowId(),
      fieldKey: typeof item.fieldKey === "string" ? item.fieldKey : "",
      operator: typeof item.operator === "string" ? item.operator : "eq",
      valueMode: typeof item.valueFrom === "string" && item.valueFrom.trim() ? "variable" : "literal",
      literalValue: item.value == null ? "" : String(item.value),
      valueFrom: typeof item.valueFrom === "string" ? item.valueFrom : "",
    }));
}

function serializeQueryFilterRows(rows: QueryFilterDraftRow[]) {
  return rows
    .filter((row) => row.fieldKey.trim() && (row.valueMode === "variable" ? row.valueFrom.trim() : row.literalValue.trim()))
    .map((row) =>
      row.valueMode === "variable"
        ? {
            fieldKey: row.fieldKey,
            operator: row.operator || "eq",
            valueFrom: row.valueFrom,
          }
        : {
            fieldKey: row.fieldKey,
            operator: row.operator || "eq",
            value: row.literalValue,
          }
    );
}

function isSameSerializedValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function useCurrentFormFieldOptions(formId: string | null) {
  const [fieldOptions, setFieldOptions] = useState<RuleFormFieldOption[]>([]);

  useEffect(() => {
    if (!formId) {
      setFieldOptions([]);
      return;
    }

    void loadInteractionRuleFieldOptions(formId)
      .then((options) => {
        setFieldOptions(options);
      })
      .catch(() => {
        setFieldOptions([]);
      });
  }, [formId]);

  return fieldOptions;
}

function useDraftFormOptions() {
  const [formOptions, setFormOptions] = useState<DraftFormSummary[]>([]);

  useEffect(() => {
    void listDraftFormsOnServer()
      .then((items) => {
        setFormOptions(items);
      })
      .catch(() => {
        setFormOptions([]);
      });
  }, []);

  return formOptions;
}

function useSourceFormFieldOptions(sourceFormId: string | null) {
  const [fieldOptions, setFieldOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!sourceFormId) {
      setFieldOptions([]);
      return;
    }

    void loadDraftFromServer(sourceFormId)
      .then((draft) => {
        setFieldOptions(buildSourceFieldOptions(draft.nodesById));
      })
      .catch(() => {
        setFieldOptions([]);
      });
  }, [sourceFormId]);

  return fieldOptions;
}

function buildRuntimeValueOptions(fieldOptions: RuleFormFieldOption[]) {
  const fixedOptions: SelectOption[] = [
    { label: "事件值 (event.value)", value: "event.value" },
    { label: "事件关键字 (event.payload.keyword)", value: "event.payload.keyword" },
    { label: "临时变量示例 (temp.queryResult)", value: "temp.queryResult" },
    { label: "临时变量示例 (temp.transformedValue)", value: "temp.transformedValue" },
  ];

  const fieldValueOptions = fieldOptions.map((item) => ({
    label: `${item.scopeLabel} · ${item.label}`,
    value: item.value,
  }));

  const unique = new Map<string, SelectOption>();
  [...fixedOptions, ...fieldValueOptions].forEach((item) => {
    if (!unique.has(item.value)) {
      unique.set(item.value, item);
    }
  });
  return Array.from(unique.values());
}

function buildRuleTempVariableOptions(graphState: InteractionRuleGraphState) {
  const variables = new Map<string, SelectOption>();

  graphState.graph.nodes.forEach((node) => {
    const candidateValues = [
      typeof node.data.saveAs === "string" ? node.data.saveAs.trim() : "",
      typeof node.data.output === "string" ? node.data.output.trim() : "",
    ].filter(Boolean);

    candidateValues.forEach((name) => {
      const normalized = name.startsWith("temp.") ? name : `temp.${name}`;
      if (!variables.has(normalized)) {
        const nodeLabel =
          typeof node.data.label === "string" && node.data.label.trim() ? node.data.label.trim() : node.type;
        variables.set(normalized, {
          label: `${nodeLabel} 输出变量 (${normalized})`,
          value: normalized,
        });
      }
    });
  });

  return Array.from(variables.values());
}

function normalizeRuntimeVariablePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("temp.") ? trimmed.slice(5) : trimmed;
}

function findProducerNodeByRuntimeVariable(graphState: InteractionRuleGraphState, runtimePath: string) {
  const normalized = normalizeRuntimeVariablePath(runtimePath);
  if (!normalized) {
    return null;
  }
  return (
    graphState.graph.nodes.find((node) => {
      const saveAs = typeof node.data.saveAs === "string" ? normalizeRuntimeVariablePath(node.data.saveAs) : "";
      const output = typeof node.data.output === "string" ? normalizeRuntimeVariablePath(node.data.output) : "";
      return saveAs === normalized || output === normalized;
    }) ?? null
  );
}

function buildDetailTableSourceFieldOptions(detailTableKey: string, fieldOptions: RuleFormFieldOption[]) {
  const prefix = `detail.${detailTableKey}.`;
  return fieldOptions
    .filter((item) => item.value.startsWith(prefix))
    .map((item) => ({
      label: item.label,
      value: item.value.slice(prefix.length),
    }));
}

function buildCurrentTargetFieldOptions(fieldOptions: RuleFormFieldOption[]) {
  const options = new Map<string, SelectOption>();
  fieldOptions.forEach((item) => {
    const segments = item.value.split(".");
    const serverFieldKey = segments[segments.length - 1] ?? item.value;
    if (!serverFieldKey || options.has(serverFieldKey)) {
      return;
    }
    options.set(serverFieldKey, {
      label: `${item.scopeLabel} · ${item.label}`,
      value: serverFieldKey,
    });
  });
  return Array.from(options.values());
}

function buildCommandDetailTableOptions(fieldOptions: RuleFormFieldOption[]) {
  const detailTables = new Map<string, string>();
  fieldOptions.forEach((item) => {
    const matched = /^detail\.([^.]+)\./.exec(item.value);
    if (!matched) {
      return;
    }
    if (!detailTables.has(matched[1])) {
      detailTables.set(matched[1], item.scopeLabel.replace(/^明细表\s*\/\s*/, ""));
    }
  });
  return Array.from(detailTables.entries()).map(([value, label]) => ({
    label: `明细表 · ${label || value}`,
    value: `detail_table:${value}`,
  }));
}

function buildLooseFieldNameOptions(values: unknown[]) {
  const options = new Map<string, SelectOption>();
  values.forEach((item) => {
    if (typeof item !== "string" || !item.trim()) {
      return;
    }
    const value = item.trim();
    if (!options.has(value)) {
      options.set(value, {
        label: value,
        value,
      });
    }
  });
  return Array.from(options.values());
}

function buildFieldOptionsFromQueryNodeData(nodeData: Record<string, unknown>) {
  return buildLooseFieldNameOptions([
    ...(Array.isArray(nodeData.displayFields) ? nodeData.displayFields : []),
    ...(Array.isArray(nodeData.filters)
      ? nodeData.filters
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .flatMap((item) => [item.fieldKey, item.valueFrom])
      : []),
    nodeData.aggregateField,
    nodeData.fieldKey,
  ]);
}

function QueryFiltersEditor({
  value,
  sourceFieldOptions,
  onChange,
}: {
  value: unknown;
  sourceFieldOptions: SelectOption[];
  onChange: (value: unknown) => void;
}) {
  const [rows, setRows] = useState<QueryFilterDraftRow[]>(() => normalizeQueryFilterRows(value));
  const serializedValue = useMemo(() => serializeQueryFilterRows(normalizeQueryFilterRows(value)), [value]);

  useEffect(() => {
    setRows(normalizeQueryFilterRows(value));
  }, [value]);

  const updateRows = (updater: QueryFilterDraftRow[] | ((current: QueryFilterDraftRow[]) => QueryFilterDraftRow[])) => {
    setRows((current) => {
      const nextRows = typeof updater === "function" ? updater(current) : updater;
      const serializedNextRows = serializeQueryFilterRows(nextRows);
      if (!isSameSerializedValue(serializedNextRows, serializedValue)) {
        onChange(serializedNextRows);
      }
      return nextRows;
    });
  };

  const columns: ColumnsType<QueryFilterDraftRow> = [
    {
      title: "来源字段",
      dataIndex: "fieldKey",
      render: (_, row) => (
        <Select
          showSearch
          placeholder="选择字段"
          options={sourceFieldOptions}
          value={row.fieldKey || undefined}
          onChange={(nextValue) =>
            updateRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, fieldKey: String(nextValue ?? "") } : item))
            )
          }
        />
      ),
    },
    {
      title: "运算符",
      dataIndex: "operator",
      width: 120,
      render: (_, row) => (
        <Select
          options={QUERY_FILTER_OPERATOR_OPTIONS}
          value={row.operator}
          onChange={(nextValue) =>
            updateRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, operator: String(nextValue ?? "eq") } : item))
            )
          }
        />
      ),
    },
    {
      title: "值类型",
      dataIndex: "valueMode",
      width: 120,
      render: (_, row) => (
        <Select
          options={[
            { label: "固定值", value: "literal" },
            { label: "变量", value: "variable" },
          ]}
          value={row.valueMode}
          onChange={(nextValue) =>
            updateRows((current) =>
              current.map((item) =>
                item.id === row.id
                  ? {
                      ...item,
                      valueMode: nextValue === "variable" ? "variable" : "literal",
                    }
                  : item
              )
            )
          }
        />
      ),
    },
    {
      title: "值",
      dataIndex: "value",
      render: (_, row) =>
        row.valueMode === "variable" ? (
          <Input
            placeholder="例如 main.customerType / temp.keyword"
            value={row.valueFrom}
            onChange={(event) =>
              updateRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, valueFrom: event.target.value } : item))
              )
            }
          />
        ) : (
          <Input
            placeholder="请输入固定值"
            value={row.literalValue}
            onChange={(event) =>
              updateRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, literalValue: event.target.value } : item))
              )
            }
          />
        ),
    },
    {
      title: "操作",
      key: "actions",
      width: 72,
      render: (_, row) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            updateRows((current) => current.filter((item) => item.id !== row.id));
          }}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center" gap={12}>
        <Space wrap>
          <Tag color={rows.length > 0 ? "blue" : "default"}>{rows.length} 条筛选</Tag>
          {sourceFieldOptions.length === 0 ? <Typography.Text type="secondary">请先选择目标表单</Typography.Text> : null}
        </Space>
        <Button
          icon={<PlusOutlined />}
          disabled={sourceFieldOptions.length === 0}
          onClick={() => {
            updateRows((current) => [
              ...current,
              {
                id: createRowId(),
                fieldKey: "",
                operator: "eq",
                valueMode: "literal" as const,
                literalValue: "",
                valueFrom: "",
              },
            ]);
          }}
        >
          新增筛选
        </Button>
      </Flex>
      {rows.length === 0 ? (
        <Empty description={sourceFieldOptions.length === 0 ? "请先选择目标表单" : "暂无筛选条件"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={rows}
        />
      )}
    </Flex>
  );
}

function TransformMappingsEditor({
  value,
  sourceFieldOptions,
  targetFieldOptions,
  onChange,
}: {
  value: unknown;
  sourceFieldOptions: SelectOption[];
  targetFieldOptions: SelectOption[];
  onChange: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TransformMappingDraftRow[]>(() => normalizeTransformMappings(value));
  const serializedValue = useMemo(() => serializeTransformMappings(normalizeTransformMappings(value)), [value]);

  useEffect(() => {
    setRows(normalizeTransformMappings(value));
  }, [value]);

  const updateRows = (
    updater:
      | TransformMappingDraftRow[]
      | ((current: TransformMappingDraftRow[]) => TransformMappingDraftRow[])
  ) => {
    setRows((current) => {
      const nextRows = typeof updater === "function" ? updater(current) : updater;
      const serializedNextRows = serializeTransformMappings(nextRows);
      if (!isSameSerializedValue(serializedNextRows, serializedValue)) {
        onChange(serializedNextRows);
      }
      return nextRows;
    });
  };

  const columns: ColumnsType<TransformMappingDraftRow> = [
    {
      title: "来源字段",
      dataIndex: "sourceField",
      width: 420,
      render: (_, row) => (
        <Select
          showSearch
          allowClear
          placeholder={sourceFieldOptions.length > 0 ? "选择来源字段" : "请先配置可解析的输入来源"}
          options={sourceFieldOptions}
          value={row.sourceField}
          style={{ width: "100%" }}
          onChange={(value) =>
            updateRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, sourceField: String(value ?? "") } : item))
            )
          }
        />
      ),
    },
    {
      title: "目标字段",
      dataIndex: "targetField",
      width: 420,
      render: (_, row) => (
        <Select
          showSearch
          allowClear
          placeholder={targetFieldOptions.length > 0 ? "选择目标字段" : "当前表单暂无可选字段"}
          options={targetFieldOptions}
          value={row.targetField}
          style={{ width: "100%" }}
          onChange={(value) =>
            updateRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, targetField: String(value ?? "") } : item))
            )
          }
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 72,
      render: (_, row) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => updateRows((current) => current.filter((item) => item.id !== row.id))}
        />
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" align="center" gap={12}>
        <Space wrap>
          <Tag color={rows.length > 0 ? "blue" : "default"}>{rows.length} 条映射</Tag>
          {sourceFieldOptions.length === 0 ? <Typography.Text type="secondary">当前还没解析出来源字段，可先新增映射后再选择输入来源</Typography.Text> : null}
        </Space>
        <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
          配置映射
        </Button>
      </Flex>
      <Modal
        title="配置字段映射"
        open={open}
        width={1180}
        onCancel={() => {
          setRows(normalizeTransformMappings(value));
          setOpen(false);
        }}
        onOk={() => {
          onChange(serializeTransformMappings(rows));
          setOpen(false);
        }}
      >
        <Flex vertical gap={16}>
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { id: createRowId(), sourceField: "", targetField: "" },
                ])
              }
            >
              新增映射
            </Button>
            <Typography.Text type="secondary">
              来源字段从当前输入来源解析，目标字段从当前表单字段中选择。
            </Typography.Text>
          </Space>
          {rows.length === 0 ? (
            <Empty description="暂无字段映射" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1040 }}
            />
          )}
        </Flex>
      </Modal>
    </>
  );
}

export function RuleNodePropertyPanel({ graphState, embedded = false }: RuleNodePropertyPanelProps) {
  const dispatch = useAppDispatch();
  const selectedNode = graphState.graph.nodes.find((item) => item.id === graphState.selectedNodeId) ?? null;
  const fieldOptions = useCurrentFormFieldOptions(graphState.formId);
  const draftForms = useDraftFormOptions();
  const fieldSelectOptions = useMemo(
    () =>
      fieldOptions.map((item) => ({
        label: `${item.scopeLabel} · ${item.label}`,
        value: item.value,
      })),
    [fieldOptions]
  );
  const fieldOptionMap = useMemo(
    () => new Map(fieldSelectOptions.map((item) => [item.value, item.label])),
    [fieldSelectOptions]
  );
  const currentTargetFieldOptions = useMemo(() => buildCurrentTargetFieldOptions(fieldOptions), [fieldOptions]);
  const commandDetailTableOptions = useMemo(() => buildCommandDetailTableOptions(fieldOptions), [fieldOptions]);
  const runtimeValueOptions = useMemo(() => {
    const fixedOptions = buildRuntimeValueOptions(fieldOptions);
    const tempVariableOptions = buildRuleTempVariableOptions(graphState);
    const merged = new Map<string, SelectOption>();
    [...tempVariableOptions, ...fixedOptions].forEach((item) => {
      if (!merged.has(item.value)) {
        merged.set(item.value, item);
      }
    });
    return Array.from(merged.values());
  }, [fieldOptions, graphState]);
  const showFieldReference = selectedNode?.type === "context";
  const showTriggerTarget = selectedNode?.type === "trigger";
  const triggerNeedsTarget =
    selectedNode?.type === "trigger" &&
    (selectedNode.data.eventType === "FIELD_CHANGE_MAIN" || selectedNode.data.eventType === "FIELD_CHANGE_DETAIL");
  const showCommandConfig = selectedNode?.type === "command";
  const showContextConfig = selectedNode?.type === "context";
  const showQueryConfig = selectedNode?.type === "query";
  const showTransformConfig = selectedNode?.type === "transform";
  const selectedCommandType =
    showCommandConfig && selectedNode
      ? typeof selectedNode.data.commandType === "string"
        ? selectedNode.data.commandType
        : typeof selectedNode.data.command === "string"
          ? selectedNode.data.command
          : "setValue"
      : "setValue";
  const commandRequiresDetailTableTarget =
    selectedCommandType === "appendRow" || selectedCommandType === "replaceTable" || selectedCommandType === "updateRow";
  const commandAllowsDetailTableTarget =
    commandRequiresDetailTableTarget ||
    selectedCommandType === "setVisible" ||
    selectedCommandType === "setReadonly";
  const showCommandLiteralValue =
    selectedCommandType === "setValue" ||
    selectedCommandType === "setVisible" ||
    selectedCommandType === "setReadonly" ||
    selectedCommandType === "setRequired";
  const showCommandValueFrom =
    selectedCommandType === "setValue" ||
    selectedCommandType === "setOptions" ||
    selectedCommandType === "setFilter" ||
    selectedCommandType === "appendRow" ||
    selectedCommandType === "updateRow" ||
    selectedCommandType === "replaceTable";
  const commandTargetOptions = useMemo(
    () => [...fieldSelectOptions, ...commandDetailTableOptions],
    [commandDetailTableOptions, fieldSelectOptions]
  );
  const selectedCommandTargetValue =
    showCommandConfig && selectedNode
      ? typeof selectedNode.data.targetType === "string" &&
        (selectedNode.data.targetType === "detail_table" || selectedNode.data.targetType === "detail_row") &&
        typeof selectedNode.data.detailTableKey === "string" &&
        selectedNode.data.detailTableKey
        ? `detail_table:${selectedNode.data.detailTableKey}`
        : typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey
          ? selectedNode.data.fieldKey
          : undefined
      : undefined;
  const transformInputSource =
    showTransformConfig && selectedNode
      ? String(selectedNode.data.input ?? selectedNode.data.valueFrom ?? selectedNode.data.fieldKey ?? "")
      : "";
  const transformProducerNode = useMemo(
    () => (showTransformConfig ? findProducerNodeByRuntimeVariable(graphState, transformInputSource) : null),
    [graphState, showTransformConfig, transformInputSource]
  );
  const transformProducerSourceType = transformProducerNode?.type === "query"
    ? normalizeQuerySourceType(transformProducerNode.data)
    : "";
  const transformProducerSourceFormId =
    transformProducerNode?.type === "query" &&
    transformProducerSourceType === "relation_records" &&
    normalizeStringValue(transformProducerNode.data.sourceFormId)
      ? normalizeStringValue(transformProducerNode.data.sourceFormId)
      : null;
  const transformProducerSourceFields = useSourceFormFieldOptions(transformProducerSourceFormId);
  const transformMappingSourceFieldOptions = useMemo(() => {
    if (transformProducerNode?.type === "query") {
      if (transformProducerSourceType === "relation_records") {
        if (transformProducerSourceFields.length > 0) {
          return transformProducerSourceFields;
        }
        return buildFieldOptionsFromQueryNodeData(transformProducerNode.data);
      }
      if (
        transformProducerSourceType === "detail_rows" &&
        typeof transformProducerNode.data.detailTableKey === "string" &&
        transformProducerNode.data.detailTableKey.trim()
      ) {
        return buildDetailTableSourceFieldOptions(transformProducerNode.data.detailTableKey, fieldOptions);
      }
    }
    if (transformProducerNode) {
      return buildFieldOptionsFromQueryNodeData(transformProducerNode.data);
    }
    if (transformInputSource.startsWith("detail.")) {
      const matched = /^detail\.([^.]+)\./.exec(transformInputSource);
      if (matched?.[1]) {
        return buildDetailTableSourceFieldOptions(matched[1], fieldOptions);
      }
    }
    return [];
  }, [fieldOptions, transformInputSource, transformProducerNode, transformProducerSourceFields, transformProducerSourceType]);
  const detailTableOptions = useMemo(() => {
    const detailTables = new Map<string, string>();
    fieldOptions.forEach((item) => {
      const matched = /^detail\.([^.]+)\./.exec(item.value);
      if (!matched) {
        return;
      }
      if (!detailTables.has(matched[1])) {
        detailTables.set(matched[1], item.scopeLabel.replace(/^明细表\s*\/\s*/, ""));
      }
    });
    return Array.from(detailTables.entries()).map(([value, label]) => ({
      value,
      label: label || value,
    }));
  }, [fieldOptions]);
  const currentQuerySourceFormId =
    selectedNode?.type === "query" && normalizeStringValue(selectedNode.data.sourceFormId)
      ? normalizeStringValue(selectedNode.data.sourceFormId)
      : null;
  const querySourceFieldOptions = useSourceFormFieldOptions(currentQuerySourceFormId);
  const draftFormOptions = useMemo(
    () =>
      draftForms.map((item) => ({
        label: `${item.name} (${item.formCode})`,
        value: item.formId,
      })),
    [draftForms]
  );
  const querySourceType =
    showQueryConfig && typeof selectedNode.data.sourceType === "string" && selectedNode.data.sourceType
      ? selectedNode.data.sourceType
      : "relation_records";
  if (!selectedNode) {
    const empty = <Empty description="请选择一个节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    if (embedded) {
      return empty;
    }
    return <Card title="节点属性" size="small">{empty}</Card>;
  }

  const content = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div>
        <Typography.Text type="secondary">节点名称</Typography.Text>
        <Input
          value={String(selectedNode.data.label ?? "")}
          onChange={(event) =>
            dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { label: event.target.value } }))
          }
        />
      </div>
      <div>
        <Typography.Text type="secondary">节点描述</Typography.Text>
        <Input.TextArea
          rows={3}
          value={String(selectedNode.data.description ?? "")}
          onChange={(event) =>
            dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { description: event.target.value } }))
          }
        />
      </div>
      {showFieldReference ? (
        <div>
          <Typography.Text type="secondary">字段引用</Typography.Text>
          <Select
            showSearch
            allowClear
            value={typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? selectedNode.data.fieldKey : undefined}
            options={fieldSelectOptions}
            onChange={(value) =>
              dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: String(value ?? "") } }))
            }
            placeholder={fieldSelectOptions.length > 0 ? "选择字段" : "当前表单暂无可选字段"}
            optionFilterProp="label"
            style={{ width: "100%" }}
            notFoundContent="当前表单暂无可选字段"
          />
          {typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey && fieldOptionMap.has(selectedNode.data.fieldKey) ? null : (
            typeof selectedNode.data.fieldKey === "string" && selectedNode.data.fieldKey ? (
              <Typography.Text type="danger">
                当前值未匹配到字段，保留原配置：{selectedNode.data.fieldKey}
              </Typography.Text>
            ) : null
          )}
        </div>
      ) : null}
      {selectedNode.type === "branch" ? (
        <Alert
          type="info"
          showIcon
          message="分流节点只负责分流"
          description="具体判断条件配置在每条条件流转连线上。直接流转边会无条件进入后续子链。"
        />
      ) : null}
      {showTriggerTarget ? (
        <>
          <div>
            <Typography.Text type="secondary">触发事件</Typography.Text>
            <Select
              value={typeof selectedNode.data.eventType === "string" ? selectedNode.data.eventType : "FIELD_CHANGE_MAIN"}
              options={INTERACTION_EVENT_TYPE_OPTIONS}
              onChange={(value) =>
                dispatch(
                  updateRuleNodeData({
                    nodeId: selectedNode.id,
                    patch:
                      value === "FIELD_CHANGE_MAIN" || value === "FIELD_CHANGE_DETAIL"
                        ? { eventType: value }
                        : { eventType: value, triggerTarget: "", targetField: "" },
                  })
                )
              }
              style={{ width: "100%" }}
            />
          </div>
          {triggerNeedsTarget ? (
            <div>
              <Typography.Text type="secondary">触发目标</Typography.Text>
              <Select
                showSearch
                allowClear
                value={
                  typeof selectedNode.data.triggerTarget === "string" && selectedNode.data.triggerTarget
                    ? selectedNode.data.triggerTarget
                    : typeof selectedNode.data.targetField === "string" && selectedNode.data.targetField
                      ? selectedNode.data.targetField
                      : undefined
                }
                options={fieldSelectOptions}
                onChange={(value) =>
                  dispatch(
                    updateRuleNodeData({
                      nodeId: selectedNode.id,
                      patch: { triggerTarget: String(value ?? ""), targetField: String(value ?? "") },
                    })
                  )
                }
                placeholder={fieldSelectOptions.length > 0 ? "选择触发字段" : "当前表单暂无可选字段"}
                optionFilterProp="label"
                style={{ width: "100%" }}
                notFoundContent="当前表单暂无可选字段"
              />
              {typeof (selectedNode.data.triggerTarget ?? selectedNode.data.targetField) === "string" &&
              String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField) &&
              fieldOptionMap.has(String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField)) ? null : typeof (selectedNode.data.triggerTarget ?? selectedNode.data.targetField) === "string" &&
                String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField) ? (
                <Typography.Text type="danger">
                  当前值未匹配到字段，保留原配置：{String(selectedNode.data.triggerTarget ?? selectedNode.data.targetField)}
                </Typography.Text>
              ) : null}
            </div>
          ) : (
            <Alert
              type="info"
              showIcon
              message="当前事件不需要触发目标"
              description="该触发事件在记录级生效，运行时会直接从规则入口开始执行。"
            />
          )}
        </>
      ) : null}
      {showQueryConfig ? (
        <>
          <Alert
            type="info"
            showIcon
            message="查询节点会把结果写入临时变量"
            description="先选择查询来源，再配置目标表单、展示字段和筛选条件。后续节点通过 saveAs 变量名读取结果。"
          />
          <div>
            <Typography.Text type="secondary">查询来源</Typography.Text>
            <Select
              value={querySourceType}
              options={QUERY_SOURCE_OPTIONS}
              onChange={(value) =>
                dispatch(
                  updateRuleNodeData({
                    nodeId: selectedNode.id,
                    patch:
                      value === "relation_records"
                        ? { sourceType: value, detailTableKey: "", fieldKey: "", valueFrom: "", literalValue: "" }
                        : value === "detail_rows"
                          ? { sourceType: value, sourceFormId: "", displayFields: [], filters: [] }
                          : { sourceType: value, sourceFormId: "", displayFields: [], filters: [], detailTableKey: "" },
                  })
                )
              }
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Typography.Text type="secondary">写入变量名</Typography.Text>
            <Input
              value={String(selectedNode.data.saveAs ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { saveAs: event.target.value } }))
              }
              placeholder="例如 customerRecords / matchedRows"
            />
          </div>
          {querySourceType === "relation_records" ? (
            <>
              <div>
                <Typography.Text type="secondary">目标表单</Typography.Text>
                <Select
                  showSearch
                  allowClear
                  value={typeof selectedNode.data.sourceFormId === "string" && selectedNode.data.sourceFormId ? selectedNode.data.sourceFormId : undefined}
                  options={draftFormOptions}
                  onChange={(value) =>
                    dispatch(
                      updateRuleNodeData({
                        nodeId: selectedNode.id,
                        patch: { sourceFormId: String(value ?? ""), displayFields: [], filters: [] },
                      })
                    )
                  }
                  placeholder={draftFormOptions.length > 0 ? "选择目标表单" : "暂无可选表单"}
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <Typography.Text type="secondary">展示字段</Typography.Text>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  value={normalizeStringArray(selectedNode.data.displayFields)}
                  options={querySourceFieldOptions}
                  onChange={(value) =>
                    dispatch(
                      updateRuleNodeData({
                        nodeId: selectedNode.id,
                        patch: { displayFields: value.map((item) => String(item)) },
                      })
                    )
                  }
                  placeholder={querySourceFieldOptions.length > 0 ? "选择候选记录展示字段" : "请先选择目标表单"}
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                  notFoundContent={currentQuerySourceFormId ? "目标表单暂无可选字段" : "请先选择目标表单"}
                />
              </div>
              <div>
                <Typography.Text type="secondary">固定关键字</Typography.Text>
                <Input
                  value={String(selectedNode.data.keyword ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { keyword: event.target.value } }))
                  }
                  placeholder="不依赖上下文时可直接填写固定关键字"
                />
              </div>
              <div>
                <Typography.Text type="secondary">关键字来源变量</Typography.Text>
                <Input
                  value={String(selectedNode.data.keywordFrom ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { keywordFrom: event.target.value } }))
                  }
                  placeholder="例如 event.payload.keyword / main.customerType"
                />
              </div>
              <div>
                <Typography.Text type="secondary">筛选条件</Typography.Text>
                <QueryFiltersEditor
                  value={selectedNode.data.filters}
                  sourceFieldOptions={querySourceFieldOptions}
                  onChange={(value) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { filters: value } }))
                  }
                />
              </div>
            </>
          ) : null}
          {querySourceType === "detail_rows" ? (
            <div>
              <Typography.Text type="secondary">目标明细表</Typography.Text>
              <Select
                allowClear
                showSearch
                value={typeof selectedNode.data.detailTableKey === "string" && selectedNode.data.detailTableKey ? selectedNode.data.detailTableKey : undefined}
                options={detailTableOptions}
                onChange={(value) =>
                  dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { detailTableKey: String(value ?? "") } }))
                }
                placeholder={detailTableOptions.length > 0 ? "选择明细表" : "当前表单暂无明细表"}
                style={{ width: "100%" }}
                notFoundContent="当前表单暂无明细表"
              />
            </div>
          ) : null}
          {querySourceType === "runtime_value" ? (
            <>
              <div>
                <Typography.Text type="secondary">字段/变量来源</Typography.Text>
                <Input
                  value={String(selectedNode.data.valueFrom ?? selectedNode.data.fieldKey ?? "")}
                  onChange={(event) =>
                    dispatch(
                      updateRuleNodeData({
                        nodeId: selectedNode.id,
                        patch: { valueFrom: event.target.value, fieldKey: event.target.value },
                      })
                    )
                  }
                  placeholder="例如 main.amount / temp.queryResult / event.value"
                />
              </div>
              <div>
                <Typography.Text type="secondary">兜底字面量值</Typography.Text>
                <Input
                  value={String(selectedNode.data.literalValue ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
                  }
                  placeholder="当来源为空时写入的默认值"
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}
      {showTransformConfig ? (
        <>
          <Alert
            type="info"
            showIcon
            message="转换节点负责改写上下文变量格式"
            description="先填写输入来源和输出变量名，再选择转换类型。常见用法是把 query/context 写入的 temp 变量进一步整理成命令可消费的结果。"
          />
          <div>
            <Typography.Text type="secondary">转换类型</Typography.Text>
            <Select
              value={
                typeof selectedNode.data.transformType === "string" && selectedNode.data.transformType
                  ? selectedNode.data.transformType
                  : "expression"
              }
              options={TRANSFORM_TYPE_OPTIONS}
              onChange={(value) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { transformType: value } }))
              }
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Typography.Text type="secondary">输入来源</Typography.Text>
            <AutoComplete
              options={runtimeValueOptions}
              filterOption={(inputValue, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(inputValue.toLowerCase()) ||
                String(option?.value ?? "")
                  .toLowerCase()
                  .includes(inputValue.toLowerCase())
              }
              value={String(selectedNode.data.input ?? selectedNode.data.valueFrom ?? selectedNode.data.fieldKey ?? "")}
              onChange={(event) =>
                dispatch(
                  updateRuleNodeData({
                    nodeId: selectedNode.id,
                    patch: { input: event, valueFrom: event, fieldKey: event },
                  })
                )
              }
              placeholder="例如 temp.customerRecords / main.amount / event.value"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Typography.Text type="secondary">输出变量名</Typography.Text>
            <Input
              value={String(selectedNode.data.output ?? selectedNode.data.saveAs ?? "")}
              onChange={(event) =>
                dispatch(
                  updateRuleNodeData({
                    nodeId: selectedNode.id,
                    patch: { output: event.target.value, saveAs: event.target.value },
                  })
                )
              }
              placeholder="例如 customerOptions / totalAmount"
            />
          </div>
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "expression" ? (
            <div>
              <Typography.Text type="secondary">兜底字面量值</Typography.Text>
              <Input
                value={String(selectedNode.data.literalValue ?? "")}
                onChange={(event) =>
                  dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
                }
                placeholder="输入为空时写入的默认值"
              />
            </div>
          ) : null}
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "option_mapping" ? (
            <div>
              <Typography.Text type="secondary">展示字段</Typography.Text>
              <Select
                mode="tags"
                allowClear
                value={normalizeStringArray(selectedNode.data.displayFields)}
                onChange={(value) =>
                  dispatch(
                    updateRuleNodeData({
                      nodeId: selectedNode.id,
                      patch: { displayFields: value.map((item) => String(item)) },
                    })
                  )
                }
                placeholder="请输入来源记录字段名，例如 customer_name、customer_code"
                style={{ width: "100%" }}
              />
            </div>
          ) : null}
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "aggregate" ? (
            <>
              <div>
                <Typography.Text type="secondary">聚合字段</Typography.Text>
                <Input
                  value={String(selectedNode.data.aggregateField ?? selectedNode.data.fieldKey ?? "")}
                  onChange={(event) =>
                    dispatch(
                      updateRuleNodeData({
                        nodeId: selectedNode.id,
                        patch: { aggregateField: event.target.value, fieldKey: event.target.value },
                      })
                    )
                  }
                  placeholder="例如 qty / amount"
                />
              </div>
              <div>
                <Typography.Text type="secondary">聚合方式</Typography.Text>
                <Select
                  value={
                    typeof selectedNode.data.aggregateFn === "string" && selectedNode.data.aggregateFn
                      ? selectedNode.data.aggregateFn
                      : "sum"
                  }
                  options={AGGREGATE_FN_OPTIONS}
                  onChange={(value) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { aggregateFn: value } }))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </>
          ) : null}
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "field_mapping" ? (
            <div>
              <Typography.Text type="secondary">字段映射</Typography.Text>
              <TransformMappingsEditor
                value={selectedNode.data.mappings}
                sourceFieldOptions={transformMappingSourceFieldOptions}
                targetFieldOptions={currentTargetFieldOptions}
                onChange={(value) =>
                  dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { mappings: value } }))
                }
              />
            </div>
          ) : null}
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "filter" ? (
            <>
              <div>
                <Typography.Text type="secondary">过滤字段</Typography.Text>
                <Input
                  value={String(selectedNode.data.fieldKey ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: event.target.value } }))
                  }
                  placeholder="例如 status / customer_type"
                />
              </div>
              <div>
                <Typography.Text type="secondary">变量条件值</Typography.Text>
                <Input
                  value={String(selectedNode.data.valueFrom ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { valueFrom: event.target.value } }))
                  }
                  placeholder="例如 temp.selectedType / main.customerType"
                />
              </div>
              <div>
                <Typography.Text type="secondary">固定条件值</Typography.Text>
                <Input
                  value={String(selectedNode.data.literalValue ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
                  }
                  placeholder="未使用变量时可填写固定值"
                />
              </div>
            </>
          ) : null}
          {(typeof selectedNode.data.transformType === "string" ? selectedNode.data.transformType : "expression") === "sort" ? (
            <>
              <div>
                <Typography.Text type="secondary">排序字段</Typography.Text>
                <Input
                  value={String(selectedNode.data.fieldKey ?? "")}
                  onChange={(event) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { fieldKey: event.target.value } }))
                  }
                  placeholder="例如 created_at / code"
                />
              </div>
              <div>
                <Typography.Text type="secondary">排序方向</Typography.Text>
                <Select
                  value={selectedNode.data.direction === "desc" ? "desc" : "asc"}
                  options={[
                    { label: "升序", value: "asc" },
                    { label: "降序", value: "desc" },
                  ]}
                  onChange={(value) =>
                    dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { direction: value } }))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}
      {showCommandConfig ? (
        <div>
          <Typography.Text type="secondary">命令/动作</Typography.Text>
          <Select
            value={selectedCommandType}
            options={COMMAND_OPTIONS}
            onChange={(value) =>
              dispatch(
                updateRuleNodeData({
                  nodeId: selectedNode.id,
                  patch:
                    value === "appendRow" || value === "replaceTable"
                      ? { commandType: value, command: value, targetType: "detail_table", fieldKey: "" }
                      : value === "updateRow"
                        ? { commandType: value, command: value, targetType: "detail_row", fieldKey: "" }
                        : value === "setVisible" || value === "setReadonly"
                          ? { commandType: value, command: value }
                          : { commandType: value, command: value, targetType: "", detailTableKey: "" },
                })
              )
            }
            style={{ width: "100%" }}
          />
        </div>
      ) : null}
      {showCommandConfig ? (
        <>
          <div>
            <Typography.Text type="secondary">操作对象</Typography.Text>
            <Select
              showSearch
              allowClear
              value={selectedCommandTargetValue}
              options={commandTargetOptions}
              onChange={(value) => {
                const nextValue = String(value ?? "");
                if (!nextValue) {
                  dispatch(
                    updateRuleNodeData({
                      nodeId: selectedNode.id,
                      patch: { fieldKey: "", detailTableKey: "", targetType: "" },
                    })
                  );
                  return;
                }
                if (nextValue.startsWith("detail_table:")) {
                  const detailTableKey = nextValue.slice("detail_table:".length);
                  dispatch(
                    updateRuleNodeData({
                      nodeId: selectedNode.id,
                      patch: {
                        detailTableKey,
                        fieldKey: "",
                        targetType:
                          selectedCommandType === "updateRow"
                            ? "detail_row"
                            : "detail_table",
                      },
                    })
                  );
                  return;
                }
                dispatch(
                  updateRuleNodeData({
                    nodeId: selectedNode.id,
                    patch: {
                      fieldKey: nextValue,
                      detailTableKey: "",
                      targetType: "",
                    },
                  })
                );
              }}
              placeholder={
                commandTargetOptions.length > 0 ? "选择操作对象" : "当前表单暂无可选对象"
              }
              optionFilterProp="label"
              style={{ width: "100%" }}
              notFoundContent="当前表单暂无可选对象"
            />
            {typeof selectedNode.data.fieldKey === "string" &&
            selectedNode.data.fieldKey &&
            fieldOptionMap.has(selectedNode.data.fieldKey) ? null : typeof selectedNode.data.fieldKey === "string" &&
              selectedNode.data.fieldKey &&
              !(typeof selectedNode.data.targetType === "string" && selectedNode.data.targetType.startsWith("detail_")) ? (
              <Typography.Text type="danger">
                当前值未匹配到字段，保留原配置：{selectedNode.data.fieldKey}
              </Typography.Text>
            ) : null}
          </div>
          {showCommandLiteralValue ? (
            <div>
              <Typography.Text type="secondary">字面量值</Typography.Text>
              <Input
                value={String(selectedNode.data.literalValue ?? "")}
                onChange={(event) =>
                  dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
                }
                placeholder={
                  selectedCommandType === "setValue"
                    ? "输入固定值"
                    : "布尔类命令请填写 true / false"
                }
              />
            </div>
          ) : null}
          {showCommandValueFrom ? (
            <div>
              <Typography.Text type="secondary">值来源变量</Typography.Text>
              <AutoComplete
                options={runtimeValueOptions}
                filterOption={(inputValue, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(inputValue.toLowerCase()) ||
                  String(option?.value ?? "")
                    .toLowerCase()
                    .includes(inputValue.toLowerCase())
                }
                value={String(selectedNode.data.valueFrom ?? "")}
                onChange={(value) =>
                  dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { valueFrom: value } }))
                }
                placeholder={
                  selectedCommandType === "appendRow" || selectedCommandType === "replaceTable"
                    ? "例如 temp.options / temp.rows"
                    : selectedCommandType === "setOptions"
                      ? "例如 temp.customerOptions"
                      : "例如 temp.transformedValue / event.value"
                }
                style={{ width: "100%" }}
              />
            </div>
          ) : null}
          <Typography.Text type="secondary">
            操作对象支持字段和明细表；其中追加/替换明细表、明细表显隐和只读类命令可直接作用到明细表。
          </Typography.Text>
        </>
      ) : null}
      {showContextConfig ? (
        <>
          <div>
            <Typography.Text type="secondary">写入变量名</Typography.Text>
            <Input
              value={String(selectedNode.data.saveAs ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { saveAs: event.target.value } }))
              }
              placeholder="例如 temp.totalAmount / matchedRecord"
            />
          </div>
          <div>
            <Typography.Text type="secondary">变量来源</Typography.Text>
            <Input
              value={String(selectedNode.data.valueFrom ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { valueFrom: event.target.value } }))
              }
              placeholder="例如 main.amount / event.value / temp.queryResult"
            />
          </div>
          <div>
            <Typography.Text type="secondary">兜底字面量值</Typography.Text>
            <Input
              value={String(selectedNode.data.literalValue ?? "")}
              onChange={(event) =>
                dispatch(updateRuleNodeData({ nodeId: selectedNode.id, patch: { literalValue: event.target.value } }))
              }
              placeholder="来源为空时写入的值"
            />
          </div>
        </>
      ) : null}
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="节点属性" size="small">{content}</Card>;
}
