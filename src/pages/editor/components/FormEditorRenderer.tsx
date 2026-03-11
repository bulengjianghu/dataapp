import { Empty, List, Tag, Typography } from "antd";
import { useAppSelector } from "../../../store/hooks";
import { selectPageChildrenIds, selectPageRootNode } from "../../../store/selectors/editorSelectors";

export function FormEditorRenderer() {
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);

  if (!pageRoot) {
    return <Empty description="页面根节点缺失（page_root）" />;
  }

  if (childrenIds.length === 0) {
    return <Empty description="空画布：请从左侧组件面板添加组件" />;
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
