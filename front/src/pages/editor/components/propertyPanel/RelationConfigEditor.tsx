import { DeleteOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Empty, Flex, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../../../store/hooks";
import { selectNodesById } from "../../../../store/selectors/editorSelectors";
import type { Node, NodesById } from "../../../../types/schema/node";
import { loadDraftFromServer } from "../../services/formPersistence";

type FieldOption = {
  label: string;
  value: string;
};

type FilterRow = {
  id: string;
  fieldKey: string;
  operator: string;
  value: string;
};

type MappingRow = {
  id: string;
  targetFieldKey: string;
  currentFieldKey: string;
};

const TEXT_CAPABLE_COMPONENTS = new Set(["input", "textarea", "number", "radio", "select", "checkbox"]);

function normalizeDisplayFields(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function useSourceFieldOptions(sourceFormId: string) {
  const [sourceFieldOptions, setSourceFieldOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    if (!sourceFormId) {
      setSourceFieldOptions([]);
      return;
    }
    void loadDraftFromServer(sourceFormId)
      .then((draft) => {
        setSourceFieldOptions(buildFieldOptions(draft.nodesById, () => true));
      })
      .catch(() => {
        setSourceFieldOptions([]);
      });
  }, [sourceFormId]);

  return sourceFieldOptions;
}

function createRowId() {
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

function isFieldNode(node: Node) {
  return node.type === "field";
}

function isTextCapableFieldNode(node: Node) {
  if (!isFieldNode(node)) {
    return false;
  }
  const component = typeof node.props.component === "string" ? node.props.component : "";
  return TEXT_CAPABLE_COMPONENTS.has(component);
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

function buildFieldOptions(nodesById: NodesById, predicate: (node: Node) => boolean) {
  return Object.values(nodesById)
    .filter((node) => isFieldNode(node) && predicate(node))
    .map((node) => ({
      label: `${getNodeLabel(node)} (${typeof node.serverId === "string" && node.serverId.trim() ? node.serverId : node.id})`,
      value: typeof node.serverId === "string" && node.serverId.trim() ? node.serverId : node.id,
    }));
}

function findDetailTableAncestor(node: Node, nodesById: NodesById): Node | null {
  let currentParentId = node.parentId;
  while (currentParentId) {
    const parent = nodesById[currentParentId];
    if (!parent) {
      return null;
    }
    if (parent.type === "detail_table") {
      return parent;
    }
    currentParentId = parent.parentId;
  }
  return null;
}

function normalizeFilterRows(value: unknown): FilterRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return {
      id: createRowId(),
      fieldKey: typeof row.fieldKey === "string" ? row.fieldKey : "",
      operator: typeof row.operator === "string" ? row.operator : "eq",
      value: row.value == null ? "" : String(row.value),
    };
  });
}

function normalizeMappingRows(value: unknown): MappingRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return {
      id: createRowId(),
      targetFieldKey: typeof row.targetFieldKey === "string" ? row.targetFieldKey : "",
      currentFieldKey: typeof row.currentFieldKey === "string" ? row.currentFieldKey : "",
    };
  });
}

export function RelationFiltersEditor({
  node,
  value,
  onChange,
}: {
  node: Node;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<FilterRow[]>(() => normalizeFilterRows(value));
  const sourceFormId = typeof node.props.sourceFormId === "string" ? node.props.sourceFormId : "";
  const sourceFieldOptions = useSourceFieldOptions(sourceFormId);

  useEffect(() => {
    setDraftRows(normalizeFilterRows(value));
  }, [value]);

  const columns: ColumnsType<FilterRow> = [
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
            setDraftRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, fieldKey: String(nextValue ?? "") } : item))
            )
          }
        />
      ),
    },
    {
      title: "运算符",
      dataIndex: "operator",
      width: 140,
      render: (_, row) => (
        <Select
          options={[
            { label: "等于", value: "eq" },
            { label: "包含", value: "contains" },
          ]}
          value={row.operator}
          onChange={(nextValue) =>
            setDraftRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, operator: String(nextValue ?? "eq") } : item))
            )
          }
        />
      ),
    },
    {
      title: "值",
      dataIndex: "value",
      render: (_, row) => (
        <Input
          placeholder="请输入筛选值"
          value={row.value}
          onChange={(event) =>
            setDraftRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item))
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
          onClick={() => setDraftRows((current) => current.filter((item) => item.id !== row.id))}
        />
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" align="center" gap={12}>
        <Space wrap>
          <Tag color={draftRows.length > 0 ? "blue" : "default"}>{draftRows.length} 条规则</Tag>
          {!sourceFormId ? <Typography.Text type="secondary">请先选择来源表单</Typography.Text> : null}
        </Space>
        <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
          配置筛选条件
        </Button>
      </Flex>
      <Modal
        title="配置筛选条件"
        open={open}
        width={860}
        onCancel={() => {
          setDraftRows(normalizeFilterRows(value));
          setOpen(false);
        }}
        onOk={() => {
          onChange(
            draftRows
              .filter((row) => row.fieldKey.trim() && row.value.trim())
              .map((row) => ({
                fieldKey: row.fieldKey,
                operator: row.operator || "eq",
                value: row.value,
              }))
          );
          setOpen(false);
        }}
      >
        <Flex vertical gap={16}>
          <Space>
            <Button
              icon={<PlusOutlined />}
              disabled={!sourceFormId}
              onClick={() =>
                setDraftRows((current) => [...current, { id: createRowId(), fieldKey: "", operator: "eq", value: "" }])
              }
            >
              新增条件
            </Button>
            <Typography.Text type="secondary">当前支持“等于”和“包含”两种一期运算符。</Typography.Text>
          </Space>
          {draftRows.length === 0 ? (
            <Empty description={sourceFormId ? "暂无筛选条件" : "请先配置来源表单"} />
          ) : (
            <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={draftRows} />
          )}
        </Flex>
      </Modal>
    </>
  );
}

export function RelationDisplayFieldsEditor({
  node,
  value,
  onChange,
}: {
  node: Node;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string[]>(() => normalizeDisplayFields(value));
  const sourceFormId = typeof node.props.sourceFormId === "string" ? node.props.sourceFormId : "";
  const sourceFieldOptions = useSourceFieldOptions(sourceFormId);

  useEffect(() => {
    setDraftValue(normalizeDisplayFields(value));
  }, [value]);

  return (
    <>
      <Flex justify="space-between" align="center" gap={12}>
        <Space wrap>
          <Tag color={draftValue.length > 0 ? "blue" : "default"}>{draftValue.length} 个字段</Tag>
          {!sourceFormId ? <Typography.Text type="secondary">请先选择来源表单</Typography.Text> : null}
        </Space>
        <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
          配置展示字段
        </Button>
      </Flex>
      <Modal
        title="配置展示字段"
        open={open}
        width={720}
        onCancel={() => {
          setDraftValue(normalizeDisplayFields(value));
          setOpen(false);
        }}
        onOk={() => {
          onChange(draftValue);
          setOpen(false);
        }}
      >
        <Flex vertical gap={16}>
          <Typography.Text type="secondary">
            这些字段会用于关联选择弹层中的候选记录展示与搜索。
          </Typography.Text>
          {!sourceFormId ? (
            <Empty description="请先配置来源表单" />
          ) : (
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="请选择一个或多个展示字段"
              options={sourceFieldOptions}
              value={draftValue}
              onChange={(nextValue) => setDraftValue(nextValue.map((item) => String(item)))}
            />
          )}
        </Flex>
      </Modal>
    </>
  );
}

export function RelationSelectedDisplayFieldEditor({
  node,
  value,
  onChange,
}: {
  node: Node;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const sourceFormId = typeof node.props.sourceFormId === "string" ? node.props.sourceFormId : "";
  const [textFieldOptions, setTextFieldOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    if (!sourceFormId) {
      setTextFieldOptions([]);
      return;
    }
    void loadDraftFromServer(sourceFormId)
      .then((draft) => {
        setTextFieldOptions(buildFieldOptions(draft.nodesById, (candidate) => isTextCapableFieldNode(candidate)));
      })
      .catch(() => {
        setTextFieldOptions([]);
      });
  }, [sourceFormId]);

  return (
    <Select
      allowClear
      showSearch
      disabled={!sourceFormId}
      placeholder={sourceFormId ? "请选择选中展示字段" : "请先选择来源表单"}
      options={textFieldOptions}
      value={typeof value === "string" && value ? value : undefined}
      onChange={(nextValue) => onChange(typeof nextValue === "string" ? nextValue : "")}
      notFoundContent={sourceFormId ? "暂无可选文本字段" : "请先选择来源表单"}
    />
  );
}

export function RelationMappingsEditor({
  node,
  value,
  onChange,
}: {
  node: Node;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const nodesById = useAppSelector(selectNodesById);
  const [open, setOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<MappingRow[]>(() => normalizeMappingRows(value));
  const sourceFormId = typeof node.props.sourceFormId === "string" ? node.props.sourceFormId : "";
  const sourceFieldOptions = useSourceFieldOptions(sourceFormId);

  useEffect(() => {
    setDraftRows(normalizeMappingRows(value));
  }, [value]);

  const currentFieldOptions = useMemo(() => {
    const detailTableAncestor = findDetailTableAncestor(node, nodesById);
    if (detailTableAncestor) {
      return buildFieldOptions(
        nodesById,
        (candidate) => candidate.parentId === detailTableAncestor.id
      );
    }

    return buildFieldOptions(nodesById, (candidate) => !findDetailTableAncestor(candidate, nodesById));
  }, [node, nodesById]);

  const columns: ColumnsType<MappingRow> = [
    {
      title: "来源字段",
      dataIndex: "targetFieldKey",
      render: (_, row) => (
        <Select
          showSearch
          placeholder="选择来源字段"
          options={sourceFieldOptions}
          value={row.targetFieldKey || undefined}
          onChange={(nextValue) =>
            setDraftRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, targetFieldKey: String(nextValue ?? "") } : item))
            )
          }
        />
      ),
    },
    {
      title: "当前字段",
      dataIndex: "currentFieldKey",
      render: (_, row) => (
        <Select
          showSearch
          placeholder="选择当前字段"
          options={currentFieldOptions}
          value={row.currentFieldKey || undefined}
          onChange={(nextValue) =>
            setDraftRows((current) =>
              current.map((item) => (item.id === row.id ? { ...item, currentFieldKey: String(nextValue ?? "") } : item))
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
          onClick={() => setDraftRows((current) => current.filter((item) => item.id !== row.id))}
        />
      ),
    },
  ];

  const scopeLabel = findDetailTableAncestor(node, nodesById) ? "当前明细表字段" : "主表字段";

  return (
    <>
      <Flex justify="space-between" align="center" gap={12}>
        <Space wrap>
          <Tag color={draftRows.length > 0 ? "blue" : "default"}>{draftRows.length} 条映射</Tag>
          <Typography.Text type="secondary">{scopeLabel}</Typography.Text>
        </Space>
        <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
          配置回填映射
        </Button>
      </Flex>
      <Modal
        title="配置回填映射"
        open={open}
        width={860}
        onCancel={() => {
          setDraftRows(normalizeMappingRows(value));
          setOpen(false);
        }}
        onOk={() => {
          onChange(
            draftRows
              .filter((row) => row.targetFieldKey.trim() && row.currentFieldKey.trim())
              .map((row) => ({
                targetFieldKey: row.targetFieldKey,
                currentFieldKey: row.currentFieldKey,
              }))
          );
          setOpen(false);
        }}
      >
        <Flex vertical gap={16}>
          <Space>
            <Button
              icon={<PlusOutlined />}
              disabled={!sourceFormId}
              onClick={() =>
                setDraftRows((current) => [...current, { id: createRowId(), targetFieldKey: "", currentFieldKey: "" }])
              }
            >
              新增映射
            </Button>
            <Typography.Text type="secondary">回填目标会根据当前组件位于主表还是明细表自动限定范围。</Typography.Text>
          </Space>
          {draftRows.length === 0 ? (
            <Empty description={sourceFormId ? "暂无回填映射" : "请先配置来源表单"} />
          ) : (
            <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={draftRows} />
          )}
        </Flex>
      </Modal>
    </>
  );
}
