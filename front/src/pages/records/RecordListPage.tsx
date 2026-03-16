import { ArrowLeftOutlined, FileAddOutlined, PrinterOutlined, ReloadOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Flex, Popconfirm, Space, Spin, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RecordFormCanvas } from "../fill/components/RecordFormCanvas";
import {
  createRecord,
  listRecordsByForm,
  loadRecordDetail,
  loadRuntimeForm,
  saveRecordDraft,
  submitRecord,
  type RecordListItem,
  type RuntimeForm,
} from "../fill/services/recordRuntime";

type DrawerMode = "create" | "edit" | "view";

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
  const [drawerData, setDrawerData] = useState<Record<string, unknown>>({});
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formId = searchParams.get("formId");
  const formCode = searchParams.get("formCode");

  const pageChildren = useMemo(() => runtimeForm?.nodesById.page_root?.childrenIds ?? [], [runtimeForm]);
  const readonly = drawerMode === "view";

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
    setDrawerData({});
    setDrawerOpen(true);
  };

  const openRecordDrawer = async (recordId: number, mode: DrawerMode) => {
    setDrawerMode(mode);
    setDrawerRecordId(recordId);
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const detail = await loadRecordDetail(recordId);
      setDrawerData(detail.data ?? {});
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
    setDrawerData({});
    setDrawerMode("create");
  };

  const handleValueChange = (fieldKey: string, value: unknown) => {
    if (readonly) {
      return;
    }
    setDrawerData((current) => {
      if (value === undefined || value === null || value === "") {
        const next = { ...current };
        delete next[fieldKey];
        return next;
      }
      return {
        ...current,
        [fieldKey]: value,
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
        width={920}
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
                onValueChange={handleValueChange}
              />
            </Flex>
          </Card>
        )}
      </Drawer>
    </div>
  );
}
