import { Button, Empty, List, Tag, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectPageChildrenIds, selectPageRootNode } from "../../../store/selectors/editorSelectors";
import { selectNode } from "../../../store/slices/formSchemaSlice";
import { PAGE_NODE_ID } from "../../../types/schema/node";

export function FormEditorRenderer() {
  const dispatch = useAppDispatch();
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);

  if (!pageRoot) {
    return <Empty description="页面根节点缺失（page_root）" />;
  }

  if (childrenIds.length === 0) {
    return (
      <Empty description="空画布：请从左侧组件面板添加组件">
        <Button size="small" onClick={() => dispatch(selectNode(PAGE_NODE_ID))}>
          选中根节点
        </Button>
      </Empty>
    );
  }

  return (
    <List
      size="small"
      bordered
      header={
        <Typography.Text type="secondary">Sprint 1 占位渲染（非最终递归渲染）</Typography.Text>
      }
      dataSource={childrenIds}
      renderItem={(nodeId, index) => (
        <List.Item>
          <Typography.Text>节点 {index + 1}</Typography.Text>
          <Tag>{nodeId}</Tag>
        </List.Item>
      )}
    />
  );
}
