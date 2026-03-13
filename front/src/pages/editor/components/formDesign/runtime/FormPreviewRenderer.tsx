import { InfoCircleOutlined } from "@ant-design/icons";
import { Card, Empty, Flex, Tooltip } from "antd";
import { useAppSelector } from "../../../../../store/hooks";
import { selectNodesById, selectPageChildrenIds, selectPageRootNode } from "../../../../../store/selectors/editorSelectors";
import { ContainerLayout } from "../shared/ContainerLayout";
import { RuntimeNodeRenderer } from "./RuntimeNodeRenderer";
import { getPageNodeDefinition } from "../../nodes";

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
  const emptyText = pageDefinition.emptyText ?? "页面暂无字段";

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <span>{title}</span>
          {description ? (
            <Tooltip title={description}>
              <InfoCircleOutlined className="preview-page__info" />
            </Tooltip>
          ) : null}
        </Flex>
      }
      className="preview-page"
    >
      <Flex vertical gap={16}>
        <ContainerLayout
          hasChildren={childrenIds.length > 0}
          emptyText={emptyText}
          emptyFallback={<Empty description={emptyText} />}
        >
          {childrenIds.map((childId) => {
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
          })}
        </ContainerLayout>
      </Flex>
    </Card>
  );
}
