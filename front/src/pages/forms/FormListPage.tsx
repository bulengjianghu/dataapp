import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDraftFormOnServer, deleteFormOnServer, listDraftFormsOnServer, type DraftFormSummary } from "./services/formList";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FormListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [forms, setForms] = useState<DraftFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadForms = async () => {
    setLoading(true);
    try {
      setForms(await listDraftFormsOnServer());
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载表单列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForms();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const formId = await createDraftFormOnServer();
      navigate(`/editor?formId=${formId}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建表单失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (formId: string) => {
    setDeletingId(formId);
    try {
      await deleteFormOnServer(formId);
      setForms((current) => current.filter((item) => item.formId !== formId));
      messageApi.success("表单已删除");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除表单失败");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<DraftFormSummary> = [
    {
      title: "表单名称",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Link onClick={() => navigate(`/editor?formId=${record.formId}`)}>{record.name}</Typography.Link>
          <Typography.Text type="secondary">{record.formCode}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (value: string) => value || <Typography.Text type="secondary">暂无描述</Typography.Text>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value: string) => <Tag color={value === "ACTIVE" ? "green" : "gold"}>{value}</Tag>,
    },
    {
      title: "草稿版本",
      dataIndex: "draftVersion",
      key: "draftVersion",
      width: 120,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => formatTime(value),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/editor?formId=${record.formId}`)}>
            编辑
          </Button>
          <Popconfirm
            title="删除表单"
            description={`确认删除“${record.name}”吗？`}
            okText="删除"
            cancelText="取消"
            onConfirm={() => void handleDelete(record.formId)}
          >
            <Button danger icon={<DeleteOutlined />} loading={deletingId === record.formId} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="form-list-page">
      {contextHolder}
      <header className="form-list-page__header">
        <div>
          <Typography.Title level={3}>表单草稿</Typography.Title>
          <Typography.Text type="secondary">查看当前已保存的草稿，并继续编辑或删除。</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadForms()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={() => void handleCreate()}>
            新建表单
          </Button>
        </Space>
      </header>
      <div className="form-list-page__table">
        <Table<DraftFormSummary>
          rowKey="formId"
          loading={loading}
          columns={columns}
          dataSource={forms}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
        />
      </div>
    </div>
  );
}
