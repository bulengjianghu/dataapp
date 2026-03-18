import { DeleteOutlined, FileTextOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip, Tree, Typography, type TreeProps } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { selectNodesById, selectSelectedNodeKey } from "../../../../store/selectors/editorSelectors";
import { deleteNode, moveNode, selectNode } from "../../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID, type Node } from "../../../../types/schema/node";
import { getComponentTitle } from "../nodes";
import { canMoveIntoParent } from "../formDesign/editor/dropRules";

type OutlineDropInfo = Parameters<NonNullable<TreeProps["onDrop"]>>[0];

function isDescendant(nodesById: Record<string, Node>, ancestorId: string, maybeDescendantId: string): boolean {
  const ancestor = nodesById[ancestorId];
  if (!ancestor) {
    return false;
  }

  if (ancestor.childrenIds.includes(maybeDescendantId)) {
    return true;
  }

  return ancestor.childrenIds.some((childId) => isDescendant(nodesById, childId, maybeDescendantId));
}

function resolveDropTarget(nodesById: Record<string, Node>, info: OutlineDropInfo) {
  const dragNodeId = String(info.dragNode.key);
  const dropNodeId = String(info.node.key);
  const dropNode = nodesById[dropNodeId];
  const dropPos = String(info.node.pos).split("-");
  const relativeDropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

  if (!dropNode || dragNodeId === PAGE_NODE_ID || dragNodeId === dropNodeId) {
    return null;
  }

  if (!info.dropToGap) {
    if (dropNode.type !== "page" && dropNode.type !== "container" && dropNode.type !== "detail_table") {
      return null;
    }

    return {
      nodeId: dragNodeId,
      targetParentId: dropNodeId,
      targetIndex: undefined as number | undefined,
    };
  }

  if (!dropNode.parentId) {
    return null;
  }

  const parentNode = nodesById[dropNode.parentId];
  if (!parentNode) {
    return null;
  }

  const dropIndex = parentNode.childrenIds.findIndex((childId) => childId === dropNodeId);
  if (dropIndex === -1) {
    return null;
  }

  const targetIndex = relativeDropPosition < 0 ? dropIndex : dropIndex + 1;

  return {
    nodeId: dragNodeId,
    targetParentId: dropNode.parentId,
    targetIndex,
  };
}

function getNodeDisplayLabel(node: Node) {
  if (node.type === "page") {
    const title = typeof node.props.title === "string" ? node.props.title.trim() : "";
    return title || "页面";
  }

  if (node.type === "detail_table") {
    const title = typeof node.props.title === "string" ? node.props.title.trim() : "";
    return title || "明细表";
  }

  const label = typeof node.props.label === "string" ? node.props.label.trim() : "";
  if (label) {
    return label;
  }

  const componentKey = typeof node.props.component === "string" ? node.props.component : node.type;
  return getComponentTitle(componentKey);
}

function getNodeMetaLabel(node: Node) {
  if (node.type === "page") {
    return "根容器";
  }

  const componentKey = typeof node.props.component === "string" ? node.props.component : node.type;
  return getComponentTitle(componentKey);
}

export function ComponentOutlineTree() {
  const dispatch = useAppDispatch();
  const nodesById = useAppSelector(selectNodesById);
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const [dragNodeKey, setDragNodeKey] = useState<string | null>(null);

  const treeData = useMemo<DataNode[]>(() => {
    const buildNode = (nodeId: string): DataNode | null => {
      const node = nodesById[nodeId];
      if (!node) {
        return null;
      }

      const children = node.childrenIds
        .map((childId) => buildNode(childId))
        .filter((child): child is DataNode => Boolean(child));

      return {
        key: node.id,
        isLeaf: children.length === 0,
        children,
        title: (
          <div className="editor-outline-tree__item">
            <div className="editor-outline-tree__main">
              <span className="editor-outline-tree__icon" aria-hidden="true">
                {node.type === "container" || node.type === "page" || node.type === "detail_table" ? <FolderOpenOutlined /> : <FileTextOutlined />}
              </span>
              <div className="editor-outline-tree__text">
                <div className="editor-outline-tree__line">
                  <Tooltip title={getNodeDisplayLabel(node)} mouseEnterDelay={0.3}>
                    <Typography.Text className="editor-outline-tree__label">
                      {Boolean(node.props.required) && node.type !== "page" ? (
                        <span className="editor-outline-tree__required">*</span>
                      ) : null}
                      {getNodeDisplayLabel(node)}
                    </Typography.Text>
                  </Tooltip>
                  <Typography.Text type="secondary" className="editor-outline-tree__meta">
                    {getNodeMetaLabel(node)}
                  </Typography.Text>
                </div>
              </div>
            </div>
            {node.id !== PAGE_NODE_ID ? (
              <Popconfirm
                title="确认删除该组件？"
                description={node.type === "container" || node.type === "detail_table" ? "删除容器会同时删除其下所有子组件" : undefined}
                okText="删除"
                cancelText="取消"
                onConfirm={(event) => {
                  event?.stopPropagation();
                  dispatch(deleteNode(node.id));
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className="editor-outline-tree__delete"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                />
              </Popconfirm>
            ) : null}
          </div>
        ),
      };
    };

    const root = buildNode(PAGE_NODE_ID);
    return root ? [root] : [];
  }, [dispatch, nodesById]);

  return (
    <div className="editor-outline-tree">
      <Tree
        blockNode
        defaultExpandAll
        draggable={{
          icon: false,
          nodeDraggable: (node) => String(node.key) !== PAGE_NODE_ID,
        }}
        selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
        treeData={treeData}
        allowDrop={({ dropNode, dropPosition }) => {
          if (!dragNodeKey) {
            return true;
          }

          const dropNodeId = String(dropNode.key);
          if (dragNodeKey === dropNodeId) {
            return false;
          }

          if (dropPosition === 0) {
            const targetNode = nodesById[dropNodeId];
            if (!targetNode || (targetNode.type !== "page" && targetNode.type !== "container" && targetNode.type !== "detail_table")) {
              return false;
            }
            return !isDescendant(nodesById, dragNodeKey, dropNodeId) && canMoveIntoParent(nodesById, dropNodeId, nodesById[dragNodeKey]);
          }

          const targetNode = nodesById[dropNodeId];
          if (!targetNode?.parentId) {
            return false;
          }

          return !isDescendant(nodesById, dragNodeKey, targetNode.parentId) && canMoveIntoParent(nodesById, targetNode.parentId, nodesById[dragNodeKey]);
        }}
        onDragStart={({ node }) => {
          setDragNodeKey(String(node.key));
        }}
        onDragEnd={() => {
          setDragNodeKey(null);
        }}
        onDrop={(info) => {
          setDragNodeKey(null);
          const target = resolveDropTarget(nodesById, info);
          if (!target) {
            return;
          }

          if (isDescendant(nodesById, target.nodeId, target.targetParentId)) {
            return;
          }
          if (!canMoveIntoParent(nodesById, target.targetParentId, nodesById[target.nodeId])) {
            return;
          }

          dispatch(
            moveNode({
              nodeId: target.nodeId,
              targetParentId: target.targetParentId,
              targetIndex: target.targetIndex,
            })
          );
        }}
        onSelect={(keys) => {
          const nextKey = typeof keys[0] === "string" ? keys[0] : null;
          dispatch(selectNode(nextKey));
        }}
      />
    </div>
  );
}
