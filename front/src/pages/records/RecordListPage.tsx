import { ArrowLeftOutlined, FileAddOutlined, PrinterOutlined, ReloadOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Flex, Input, Modal, Popconfirm, Space, Spin, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Node } from "../../types/schema/node";
import { RecordFormCanvas } from "../fill/components/RecordFormCanvas";
import {
  createRecord,
  formatRelationDisplayValue,
  getRelationFieldLabel,
  listRecordsByForm,
  loadRuntimeFormById,
  loadRecordDetail,
  loadRuntimeForm,
  saveRecordDraft,
  searchRelationRecords,
  submitRecord,
  type RecordListItem,
  type RecordRuntimeData,
  type RelationRecord,
  type RuntimeForm,
} from "../fill/services/recordRuntime";

type DrawerMode = "create" | "edit" | "view";
type RelationDialogContext = {
  node: Node;
  detailTableKey?: string;
  rowIndex?: number;
};

function createEmptyRuntimeData(): RecordRuntimeData {
  return {
    mainData: {},
    detailTables: {},
  };
}

function getFieldKey(node: Node) {
  return typeof node.serverId === "string" ? node.serverId : "";
}

function buildDefaultDetailRow(columnNodes: Node[]) {
  return columnNodes.reduce<Record<string, unknown>>((result, columnNode) => {
    const fieldKey = getFieldKey(columnNode);
    if (fieldKey) {
      result[fieldKey] = undefined;
    }
    return result;
  }, {});
}

function buildRelationDisplayKey(node: Node, detailTableKey?: string, rowIndex?: number) {
  return [node.id, detailTableKey ?? "MAIN", typeof rowIndex === "number" ? String(rowIndex) : "ROOT"].join(":");
}

function readRelationDisplayFields(node: Node) {
  return Array.isArray(node.props.displayFields)
    ? node.props.displayFields.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readSelectedDisplayField(node: Node) {
  return typeof node.props.selectedDisplayField === "string" ? node.props.selectedDisplayField.trim() : "";
}

export function RecordListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [runtimeForm, setRuntimeForm] = useState<RuntimeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [drawerRecordId, setDrawerRecordId] = useState<number | null>(null);
  const [drawerData, setDrawerData] = useState<RecordRuntimeData>(createEmptyRuntimeData());
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [relationDialogContext, setRelationDialogContext] = useState<RelationDialogContext | null>(null);
  const [relationKeyword, setRelationKeyword] = useState("");
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationRecords, setRelationRecords] = useState<RelationRecord[]>([]);
  const [selectedRelationRecordId, setSelectedRelationRecordId] = useState<number | null>(null);
  const [relationEmptyHint, setRelationEmptyHint] = useState("暂无可选关联记录");
  const [relationSourceForms, setRelationSourceForms] = useState<Record<number, RuntimeForm>>({});
  const [relationDisplayValues, setRelationDisplayValues] = useState<Record<string, string>>({});

  const formId = searchParams.get("formId");
  const formCode = searchParams.get("formCode");

  const pageChildren = useMemo(() => runtimeForm?.nodesById.page_root?.childrenIds ?? [], [runtimeForm]);
  const readonly = drawerMode === "view";

  const ensureRelationSourceForm = async (sourceFormId: number) => {
    const cached = relationSourceForms[sourceFormId];
    if (cached) {
      return cached;
    }
    const loaded = await loadRuntimeFormById(sourceFormId);
    setRelationSourceForms((current) => ({ ...current, [sourceFormId]: loaded }));
    return loaded;
  };

  const resolveRelationDisplayText = (
    node: Node,
    record: RelationRecord,
    sourceForm: RuntimeForm | undefined
  ) => {
    const selectedDisplayField = readSelectedDisplayField(node);
    if (selectedDisplayField) {
      const value = formatRelationDisplayValue(sourceForm?.nodesById, selectedDisplayField, record.mainData[selectedDisplayField]);
      if (value) {
        return value;
      }
    }
    const displayFields = readRelationDisplayFields(node);
    if (displayFields.length > 0) {
      const fallback = displayFields
        .map((fieldKey) => formatRelationDisplayValue(sourceForm?.nodesById, fieldKey, record.mainData[fieldKey]))
        .filter(Boolean)
        .join(" / ");
      if (fallback) {
        return fallback;
      }
    }
    return String(record.id);
  };

  const getRelationDisplayValue = (node: Node, detailTableKey?: string, rowIndex?: number) =>
    relationDisplayValues[buildRelationDisplayKey(node, detailTableKey, rowIndex)];

  const loadPage = async () => {
    if (!formId || !formCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [runtime, recordItems] = await Promise.all([
        loadRuntimeForm(formCode),
        listRecordsByForm(Number(formId)),
      ]);
      setRuntimeForm(runtime);
      setRecords(recordItems);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载记录列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = window.localStorage.getItem("dataapp.accessToken");
    if (!token) {
      const redirect = `/records?${searchParams.toString()}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }
    void loadPage();
  }, [formId, formCode, searchParams, navigate]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setDrawerRecordId(null);
    setDrawerData(createEmptyRuntimeData());
    setRelationDisplayValues({});
    setDrawerOpen(true);
  };

  const openRecordDrawer = async (recordId: number, mode: DrawerMode) => {
    setDrawerMode(mode);
    setDrawerRecordId(recordId);
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const detail = await loadRecordDetail(recordId);
      setDrawerData({
        mainData: detail.mainData ?? {},
        detailTables: detail.detailTables ?? {},
      });
      setRelationDisplayValues({});
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载记录详情失败");
      setDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    if (saving || submitting) {
      return;
    }
    setDrawerOpen(false);
    setDrawerRecordId(null);
    setDrawerData(createEmptyRuntimeData());
    setDrawerMode("create");
    setRelationDialogOpen(false);
    setRelationDialogContext(null);
    setRelationEmptyHint("暂无可选关联记录");
    setRelationDisplayValues({});
  };

  const handleMainValueChange = (fieldKey: string, value: unknown) => {
    if (readonly) {
      return;
    }
    setDrawerData((current) => {
      const nextMainData = { ...current.mainData };
      if (value === undefined || value === null || value === "") {
        delete nextMainData[fieldKey];
      } else {
        nextMainData[fieldKey] = value;
      }
      return {
        ...current,
        mainData: nextMainData,
      };
    });
  };

  const handleAddDetailRow = (detailTableKey: string, columnNodes: Node[], defaultRowCount: number) => {
    if (readonly) {
      return;
    }
    setDrawerData((current) => {
      const existingRows = current.detailTables[detailTableKey] ?? [];
      const rowsToAppend = Array.from({ length: Math.max(defaultRowCount, 1) }, () => buildDefaultDetailRow(columnNodes));
      return {
        ...current,
        detailTables: {
          ...current.detailTables,
          [detailTableKey]: [...existingRows, ...rowsToAppend],
        },
      };
    });
  };

  const handleRemoveDetailRow = (detailTableKey: string, rowIndex: number) => {
    if (readonly) {
      return;
    }
    setDrawerData((current) => ({
      ...current,
      detailTables: {
        ...current.detailTables,
        [detailTableKey]: (current.detailTables[detailTableKey] ?? []).filter((_, index) => index !== rowIndex),
      },
    }));
  };

  const handleDetailValueChange = (detailTableKey: string, rowIndex: number, fieldKey: string, value: unknown) => {
    if (readonly) {
      return;
    }
    setDrawerData((current) => {
      const rows = [...(current.detailTables[detailTableKey] ?? [])];
      const row = { ...(rows[rowIndex] ?? {}) };
      if (value === undefined || value === null || value === "") {
        delete row[fieldKey];
      } else {
        row[fieldKey] = value;
      }
      rows[rowIndex] = row;
      return {
        ...current,
        detailTables: {
          ...current.detailTables,
          [detailTableKey]: rows,
        },
      };
    });
  };

  const ensureRecord = async () => {
    if (!runtimeForm) {
      throw new Error("表单未加载完成");
    }
    if (drawerRecordId) {
      return drawerRecordId;
    }
    const createdRecordId = await createRecord(runtimeForm.formId, runtimeForm.versionId, drawerData);
    setDrawerRecordId(createdRecordId);
    await loadPage();
    return createdRecordId;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const recordId = await ensureRecord();
      await saveRecordDraft(recordId, drawerData);
      messageApi.success("草稿已保存");
      await loadPage();
      setDrawerMode("edit");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存草稿失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const recordId = await ensureRecord();
      await submitRecord(recordId, drawerData);
      messageApi.success("提交成功");
      await loadPage();
      setDrawerMode("view");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const loadRelationRecords = async (context: RelationDialogContext, keyword = "") => {
    const sourceFormId = Number(context.node.props.sourceFormId);
    if (!sourceFormId) {
      messageApi.warning("请先在编辑器中为关联选择组件配置来源表单");
      return;
    }
    setRelationLoading(true);
    try {
      const sourceForm = await ensureRelationSourceForm(sourceFormId);
      const displayFields = readRelationDisplayFields(context.node);
      const filters = Array.isArray(context.node.props.filters)
        ? context.node.props.filters.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];
      const result = await searchRelationRecords({
        sourceFormId,
        keyword,
        displayFields,
        filters,
        sourceNodesById: sourceForm.nodesById,
      });
      setRelationRecords(result.records);
      setSelectedRelationRecordId(result.records[0]?.id ?? null);
      if (result.records.length === 0 && result.totalCount > 0) {
        const reasons: string[] = [];
        if (keyword.trim()) {
          reasons.push(`关键字“${keyword.trim()}”`);
        }
        if (filters.length > 0) {
          reasons.push(`${filters.length} 条筛选条件`);
        }
        setRelationEmptyHint(
          reasons.length > 0
            ? `来源表单共有 ${result.totalCount} 条记录，但被${reasons.join("和")}过滤后暂无匹配结果`
            : "暂无可选关联记录"
        );
      } else {
        setRelationEmptyHint("暂无可选关联记录");
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载关联记录失败");
    } finally {
      setRelationLoading(false);
    }
  };

  const openRelationDialog = (node: Node, detailTableKey?: string, rowIndex?: number) => {
    const context = { node, detailTableKey, rowIndex };
    setRelationDialogContext(context);
    setRelationDialogOpen(true);
    setRelationKeyword("");
    void loadRelationRecords(context, "");
  };

  const closeRelationDialog = () => {
    setRelationDialogOpen(false);
    setRelationDialogContext(null);
    setRelationKeyword("");
    setRelationRecords([]);
    setSelectedRelationRecordId(null);
    setRelationEmptyHint("暂无可选关联记录");
  };

  const handleConfirmRelationRecord = async () => {
    if (!relationDialogContext || selectedRelationRecordId == null) {
      return;
    }

    const selectedRecord = relationRecords.find((record) => record.id === selectedRelationRecordId);
    if (!selectedRecord) {
      return;
    }

    const sourceFormId = Number(relationDialogContext.node.props.sourceFormId);
    const sourceForm = sourceFormId ? await ensureRelationSourceForm(sourceFormId) : undefined;
    const displayText = resolveRelationDisplayText(relationDialogContext.node, selectedRecord, sourceForm);

    const fieldKey = getFieldKey(relationDialogContext.node);
    const mappings = Array.isArray(relationDialogContext.node.props.mappings)
      ? relationDialogContext.node.props.mappings.filter((item): item is { targetFieldKey?: unknown; currentFieldKey?: unknown } => typeof item === "object" && item !== null)
      : [];

    if (relationDialogContext.detailTableKey && typeof relationDialogContext.rowIndex === "number") {
      setDrawerData((current) => {
        const rows = [...(current.detailTables[relationDialogContext.detailTableKey!] ?? [])];
        const row = { ...(rows[relationDialogContext.rowIndex!] ?? {}) };
        row[fieldKey] = selectedRecord.id;
        mappings.forEach((mapping) => {
          const targetFieldKey = typeof mapping.targetFieldKey === "string" ? mapping.targetFieldKey : "";
          const currentFieldKey = typeof mapping.currentFieldKey === "string" ? mapping.currentFieldKey : "";
          if (targetFieldKey && currentFieldKey) {
            row[currentFieldKey] = selectedRecord.mainData[targetFieldKey];
          }
        });
        rows[relationDialogContext.rowIndex!] = row;
        return {
          ...current,
          detailTables: {
            ...current.detailTables,
            [relationDialogContext.detailTableKey!]: rows,
          },
        };
      });
    } else {
      setDrawerData((current) => {
        const nextMainData = {
          ...current.mainData,
          [fieldKey]: selectedRecord.id,
        };
        mappings.forEach((mapping) => {
          const targetFieldKey = typeof mapping.targetFieldKey === "string" ? mapping.targetFieldKey : "";
          const currentFieldKey = typeof mapping.currentFieldKey === "string" ? mapping.currentFieldKey : "";
          if (targetFieldKey && currentFieldKey) {
            nextMainData[currentFieldKey] = selectedRecord.mainData[targetFieldKey];
          }
        });
        return {
          ...current,
          mainData: nextMainData,
        };
      });
    }

    setRelationDisplayValues((current) => ({
      ...current,
      [buildRelationDisplayKey(relationDialogContext.node, relationDialogContext.detailTableKey, relationDialogContext.rowIndex)]: displayText,
    }));

    closeRelationDialog();
  };

  const columns: ColumnsType<RecordListItem> = [
    {
      title: "记录 ID",
      dataIndex: "id",
      key: "id",
      render: (value: number) => (
        <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => void openRecordDrawer(value, "view")}>
          {value}
        </Button>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (value: string) => <Tag color={value === "SUBMITTED" ? "green" : "gold"}>{value}</Tag>,
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          {record.status === "DRAFT" ? (
            <Button size="small" onClick={() => void openRecordDrawer(record.id, "edit")}>
              继续填写
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const relationDialogColumns = useMemo<ColumnsType<RelationRecord>>(() => {
    if (!relationDialogContext) {
      return [];
    }
    const sourceFormId = Number(relationDialogContext.node.props.sourceFormId);
    const sourceForm = sourceFormId ? relationSourceForms[sourceFormId] : undefined;
    const displayFields = readRelationDisplayFields(relationDialogContext.node);

    if (displayFields.length === 0) {
      return [
        {
          title: "记录 ID",
          dataIndex: "id",
          key: "id",
          render: (value: number) => `#${value}`,
        },
      ];
    }

    return displayFields.map((fieldKey) => ({
      title: getRelationFieldLabel(sourceForm?.nodesById, fieldKey),
      key: fieldKey,
      render: (_, record) => formatRelationDisplayValue(sourceForm?.nodesById, fieldKey, record.mainData[fieldKey]) || "-",
    }));
  }, [relationDialogContext, relationSourceForms]);

  if (loading) {
    return (
      <div className="fill-page-shell__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!formId || !formCode || !runtimeForm) {
    return <Empty description="缺少表单参数" />;
  }

  return (
    <div className="form-list-page">
      {contextHolder}
      <header className="form-list-page__header">
        <div>
          <Space align="center" size={12}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/forms")}>
              返回
            </Button>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {runtimeForm.name || "我的填报记录"}
            </Typography.Title>
          </Space>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadPage()}>
            刷新
          </Button>
          <Button icon={<FileAddOutlined />} type="primary" onClick={openCreateDrawer}>
            新增
          </Button>
          <Button onClick={() => messageApi.info("导出能力后续接入后端文件生成逻辑。")}>
            导出
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => messageApi.info("打印能力将在后续阶段接入模板与打印服务。")}>
            打印
          </Button>
        </Space>
      </header>
      <div className="form-list-page__table">
        <Table<RecordListItem> rowKey="id" columns={columns} dataSource={records} pagination={{ pageSize: 10, hideOnSinglePage: true }} />
      </div>

      <Drawer
        destroyOnClose
        width={1000}
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === "create" ? "新增填报" : drawerMode === "edit" ? "填写记录" : "记录详情"}
        extra={
          readonly ? (
            <Tag color="blue">只读</Tag>
          ) : (
            <Space>
              <Button icon={<SaveOutlined />} loading={saving} onClick={() => void handleSaveDraft()}>
                保存草稿
              </Button>
              <Popconfirm
                title="提交记录"
                description="提交后该记录将进入只读查看状态，确认提交吗？"
                okText="提交"
                cancelText="取消"
                onConfirm={() => handleSubmit()}
              >
                <Button type="primary" icon={<SendOutlined />} loading={submitting}>
                  提交
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {drawerLoading ? (
          <div className="fill-page-shell__loading fill-page-shell__loading--drawer">
            <Spin size="large" />
          </div>
        ) : (
          <Card bordered={false} className="record-drawer__card">
            <Flex vertical gap={16}>
              <RecordFormCanvas
                nodesById={runtimeForm.nodesById}
                pageChildren={pageChildren}
                data={drawerData}
                readonly={readonly}
                onMainValueChange={handleMainValueChange}
                onAddDetailRow={handleAddDetailRow}
                onRemoveDetailRow={handleRemoveDetailRow}
                onDetailValueChange={handleDetailValueChange}
                onOpenRelationSelect={openRelationDialog}
                getRelationDisplayValue={getRelationDisplayValue}
              />
            </Flex>
          </Card>
        )}
      </Drawer>

      <Modal
        title="关联选择"
        open={relationDialogOpen}
        onCancel={closeRelationDialog}
        onOk={() => void handleConfirmRelationRecord()}
        okButtonProps={{ disabled: selectedRelationRecordId == null }}
        width={860}
        destroyOnClose
      >
        <Flex vertical gap={16}>
          <Input.Search
            placeholder="输入关键字搜索关联记录"
            value={relationKeyword}
            onChange={(event) => setRelationKeyword(event.target.value)}
            onSearch={(value) => {
              setRelationKeyword(value);
              if (relationDialogContext) {
                void loadRelationRecords(relationDialogContext, value);
              }
            }}
          />
          {relationLoading ? (
            <div className="fill-page-shell__loading fill-page-shell__loading--drawer">
              <Spin />
            </div>
          ) : relationRecords.length === 0 ? (
            <Empty description={relationEmptyHint} />
          ) : (
            <Table<RelationRecord>
              rowKey="id"
              size="small"
              pagination={false}
              columns={relationDialogColumns}
              dataSource={relationRecords}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedRelationRecordId == null ? [] : [selectedRelationRecordId],
                onChange: (selectedRowKeys) => {
                  const nextKey = selectedRowKeys[0];
                  setSelectedRelationRecordId(typeof nextKey === "number" ? nextKey : null);
                },
              }}
              onRow={(record) => ({
                onClick: () => setSelectedRelationRecordId(record.id),
              })}
              expandable={{
                expandedRowRender: (record) => (
                  <Space>
                    <Typography.Text type="secondary">记录 #{record.id}</Typography.Text>
                    <Tag color={record.status === "SUBMITTED" ? "green" : "gold"}>{record.status}</Tag>
                  </Space>
                ),
              }}
            />
          )}
        </Flex>
      </Modal>
    </div>
  );
}
