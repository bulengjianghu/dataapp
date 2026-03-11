import { useDroppable } from "@dnd-kit/core";
import { Card, Empty, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
} from "../../../store/selectors/editorSelectors";
import { selectNode } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID, type Node } from "../../../types/schema/node";

function NodeChip({
  node,
  depth,
  onSelect,
}: {
  node: Node;
  depth: number;
  onSelect: (nodeId: string) => void;
}) {
  const label = (node.props.label as string | undefined) ?? node.id;

  if (node.type === "container") {
    return (
      <Card
        size="small"
        style={{ marginLeft: depth * 12, marginBottom: 8, borderStyle: "dashed" }}
        title={
          <Space>
            <Tag color="blue">container</Tag>
            <Typography.Text>{label}</Typography.Text>
          </Space>
        }
        extra={
          <Typography.Link onClick={() => onSelect(node.id)} style={{ fontSize: 12 }}>
            选中
          </Typography.Link>
        }
      />
    );
  }

  return (
    <Card
      size="small"
      style={{ marginLeft: depth * 12, marginBottom: 8 }}
      title={
        <Space>
          <Tag>{node.type}</Tag>
          <Typography.Text>{label}</Typography.Text>
        </Space>
      }
      extra={
        <Typography.Link onClick={() => onSelect(node.id)} style={{ fontSize: 12 }}>
          选中
        </Typography.Link>
      }
    />
  );
}

function RootDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "drop:form-root",
    data: { type: "form-root" },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        border: "1px dashed #d1d5db",
        borderColor: isOver ? "#1677ff" : "#d1d5db",
        borderRadius: 8,
        padding: 12,
        minHeight: 120,
      }}
    >
      {children}
    </div>
  );
}

function ContainerDropZone({
  containerId,
  children,
}: {
  containerId: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:container:${containerId}`,
    data: { type: "container", containerId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        border: "1px dashed #e5e7eb",
        borderColor: isOver ? "#1677ff" : "#e5e7eb",
        borderRadius: 8,
        padding: 8,
      }}
    >
      {children}
    </div>
  );
}

export function FormEditorRenderer() {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const nodesById = useAppSelector(selectNodesById);

  const renderNodeTree = (nodeId: string, depth: number): JSX.Element => {
    const node = nodesById[nodeId];
    if (!node) {
      return (
        <Card key={nodeId} size="small" style={{ marginLeft: depth * 12, marginBottom: 8 }}>
          <Typography.Text type="danger">节点缺失: {nodeId}</Typography.Text>
        </Card>
      );
    }

    if (node.type !== "container") {
      return <NodeChip key={nodeId} node={node} depth={depth} onSelect={(id) => dispatch(selectNode(id))} />;
    }

    return (
      <div key={nodeId}>
        <NodeChip node={node} depth={depth} onSelect={(id) => dispatch(selectNode(id))} />
        <div style={{ marginLeft: depth * 12 + 12, marginBottom: 8 }}>
          <ContainerDropZone containerId={node.id}>
            {node.childrenIds.length === 0 ? (
              <Typography.Text type="secondary">容器为空（可投放区域）</Typography.Text>
            ) : (
              node.childrenIds.map((childId) => renderNodeTree(childId, depth + 1))
            )}
          </ContainerDropZone>
        </div>
      </div>
    );
  };

  if (!pageRoot) {
    return <Empty description="页面根节点缺失（page_root）" />;
  }

  if (childrenIds.length === 0) {
    return (
      <RootDropZone>
        <Empty description="空画布：请从左侧组件面板添加组件">
          <Typography.Link onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>
            选中根节点
          </Typography.Link>
        </Empty>
      </RootDropZone>
    );
  }

  return <RootDropZone>{childrenIds.map((nodeId) => renderNodeTree(nodeId, 0))}</RootDropZone>;
}
