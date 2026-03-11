import { Typography } from "antd";

export function ContainerFields({
  childIds,
  depth,
  renderNode,
}: {
  childIds: string[];
  depth: number;
  renderNode: (nodeId: string, depth: number) => JSX.Element;
}) {
  if (childIds.length === 0) {
    return <Typography.Text type="secondary">容器为空（可投放区域）</Typography.Text>;
  }

  return <>{childIds.map((childId) => renderNode(childId, depth + 1))}</>;
}
