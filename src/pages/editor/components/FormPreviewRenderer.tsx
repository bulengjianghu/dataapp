import { Card, Empty, Flex, Typography } from "antd";
import { useAppSelector } from "../../../store/hooks";
import { selectNodesById, selectPageChildrenIds, selectPageRootNode } from "../../../store/selectors/editorSelectors";
import { RuntimeNodeRenderer } from "./RuntimeNodeRenderer";
import { getPageNodeDefinition } from "./nodes";

export function FormPreviewRenderer() {
  const nodesById = useAppSelector(selectNodesById);
  const pageRoot = useAppSelector(selectPageRootNode);
  const childrenIds = useAppSelector(selectPageChildrenIds);
  const pageDefinition = getPageNodeDefinition();

  if (!pageRoot) {
    return <Empty description="页面根节点缺失" />;
  }

  const title = typeof pageRoot.props.title === "string" && pageRoot.props.title.trim() ? pageRoot.props.title : "未命名表单";
  const description = typeof pageRoot.props.description === "string" ? pageRoot.props.description : "";

  return (
    <Card title={pageDefinition.title} className="preview-page">
      <Flex vertical gap={16}>
        <div>
          <Typography.Title level={3} className="preview-page__title">
            {title}
          </Typography.Title>
          {description ? (
            <Typography.Paragraph type="secondary" className="preview-page__description">
              {description}
            </Typography.Paragraph>
          ) : null}
        </div>
        <div className="runtime-node__children-grid">
          {childrenIds.length > 0 ? (
            childrenIds.map((childId) => {
              const childNode = nodesById[childId];
              if (!childNode) {
                return null;
              }
              const span = typeof childNode.layout.span === "number" ? Math.max(6, Math.min(24, childNode.layout.span)) : 24;
              return (
                <div key={childId} style={{ gridColumn: `span ${span}` }}>
                  <RuntimeNodeRenderer node={childNode} nodesById={nodesById} />
                </div>
              );
            })
          ) : (
            <Empty description={pageDefinition.emptyText} />
          )}
        </div>
      </Flex>
    </Card>
  );
}
