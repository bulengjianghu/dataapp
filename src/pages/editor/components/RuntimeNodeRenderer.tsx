import { Card, Empty, Flex, Typography } from "antd";
import type { Node, NodesById } from "../../../types/schema/node";
import { componentDefinitions, getPageNodeDefinition } from "./nodes";

function RuntimeField({
  node,
}: {
  node: Node;
}) {
  const componentKey = typeof node.props.component === "string" ? node.props.component : "";
  const definition = componentDefinitions[componentKey];
  const label = typeof node.props.label === "string" ? node.props.label : definition?.title ?? node.id;
  const helpText = typeof node.props.helpText === "string" ? node.props.helpText : "";

  if (!definition) {
    return <Empty description={`未识别组件: ${componentKey || node.id}`} />;
  }

  return (
    <Flex vertical gap={8}>
      <Typography.Text strong>
        {Boolean(node.props.required) ? <span className="runtime-node__required">*</span> : null}
        {label}
      </Typography.Text>
      {definition.renderRuntime(node)}
      {helpText ? <Typography.Text type="secondary">{helpText}</Typography.Text> : null}
    </Flex>
  );
}

function RuntimeContainer({
  node,
  nodesById,
}: {
  node: Node;
  nodesById: NodesById;
}) {
  const definition = componentDefinitions.container;
  const label = typeof node.props.label === "string" ? node.props.label : definition.title;

  return (
    <Card size="small" title={label} className="runtime-node__container">
      <Flex vertical gap={8}>
        {definition.renderRuntime(node)}
        <div className="runtime-node__children-grid">
          {node.childrenIds.length > 0 ? (
            node.childrenIds.map((childId) => {
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
            <Empty description="容器暂无字段" />
          )}
        </div>
      </Flex>
    </Card>
  );
}

export function RuntimeNodeRenderer({
  node,
  nodesById,
}: {
  node: Node;
  nodesById: NodesById;
}) {
  if (node.type === "container") {
    return <RuntimeContainer node={node} nodesById={nodesById} />;
  }

  if (node.type === "page") {
    return getPageNodeDefinition().renderRuntime(node);
  }

  return <RuntimeField node={node} />;
}
