import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, Empty, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { ContainerEditorWrapper } from "./ContainerEditorWrapper";
import { ContainerFields } from "./ContainerFields";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  selectNodesById,
  selectPageChildrenIds,
  selectPageRootNode,
  selectSelectedNodeKey,
} from "../../../store/selectors/editorSelectors";
import { selectNode } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID, type Node } from "../../../types/schema/node";

function NodeChip({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    data: {
      source: "node",
      nodeId: node.id,
    },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:node:${node.id}`,
    data: {
      type: "node",
      nodeId: node.id,
    },
  });

  const label = (node.props.label as string | undefined) ?? node.id;
  const style = {
    marginLeft: depth * 12,
    marginBottom: 8,
    cursor: "grab",
    opacity: isDragging ? 0.4 : 1,
    borderColor: isOver ? "#1677ff" : selected ? "#1677ff" : undefined,
    boxShadow: selected ? "0 0 0 2px rgba(22, 119, 255, 0.18)" : undefined,
    background: selected ? "#f0f7ff" : undefined,
  };

  if (node.type === "container") {
    return (
      <Card
        ref={(element) => {
          setNodeRef(element);
          setDropRef(element);
        }}
        {...listeners}
        {...attributes}
        size="small"
        style={{ ...style, borderStyle: "dashed" }}
        onClick={() => onSelect(node.id)}
        title={
          <Space>
            <Tag color="blue">container</Tag>
            <Typography.Text>{label}</Typography.Text>
          </Space>
        }
      />
    );
  }

  return (
    <Card
      ref={(element) => {
        setNodeRef(element);
        setDropRef(element);
      }}
      {...listeners}
      {...attributes}
      size="small"
      style={style}
      onClick={() => onSelect(node.id)}
      title={
        <Space>
          <Tag>{node.type}</Tag>
          <Typography.Text>{label}</Typography.Text>
        </Space>
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

export function FormEditorRenderer() {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);

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
      return (
        <NodeChip
          key={nodeId}
          node={node}
          depth={depth}
          selected={selectedNodeKey === node.id}
          onSelect={(id) => dispatch(selectNode(id))}
        />
      );
    }

    return (
      <ContainerEditorWrapper
        key={nodeId}
        node={node}
        depth={depth}
        selected={selectedNodeKey === node.id}
        onSelect={(id) => dispatch(selectNode(id))}
      >
        <ContainerFields childIds={node.childrenIds} depth={depth} renderNode={renderNodeTree} />
      </ContainerEditorWrapper>
    );
  };

  if (!pageRoot) {
    return <Empty description="页面根节点缺失（page_root）" />;
  }

  if (childrenIds.length === 0) {
    return (
      <RootDropZone>
        <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 24 }}>
          <Empty description="空画布：请从左侧组件面板添加组件">
            <Typography.Link onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>
              选中根节点
            </Typography.Link>
          </Empty>
        </div>
      </RootDropZone>
    );
  }

  return <RootDropZone>{childrenIds.map((nodeId) => renderNodeTree(nodeId, 0))}</RootDropZone>;
}
