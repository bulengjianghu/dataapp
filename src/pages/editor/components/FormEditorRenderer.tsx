import { Card, Empty, Space, Tag, Typography } from "antd";
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
        {node.childrenIds.length === 0 ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginLeft: depth * 12 + 12, marginBottom: 8 }}
          >
            容器为空（Sprint 2 后续接入投放）
          </Typography.Text>
        ) : (
          node.childrenIds.map((childId) => renderNodeTree(childId, depth + 1))
        )}
      </div>
    );
  };

  if (!pageRoot) {
    return <Empty description="页面根节点缺失（page_root）" />;
  }

  if (childrenIds.length === 0) {
    return (
      <Empty description="空画布：请从左侧组件面板添加组件">
        <Typography.Link onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>
          选中根节点
        </Typography.Link>
      </Empty>
    );
  }

  return <div>{childrenIds.map((nodeId) => renderNodeTree(nodeId, 0))}</div>;
}
