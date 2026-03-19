import { Card, Empty, Select, Space, Tag, Typography } from "antd";
import { useAppDispatch } from "../../../store/hooks";
import {
  updateRuleEdge,
  type InteractionRuleGraphState,
} from "../../../store/slices/interactionRuleGraphSlice";

type RuleEdgePropertyPanelProps = {
  graphState: InteractionRuleGraphState;
  embedded?: boolean;
};

const BRANCH_OPTIONS = [
  { label: "默认成功", value: "success" },
  { label: "失败分支", value: "failure" },
  { label: "条件为真", value: "true" },
  { label: "条件为假", value: "false" },
  { label: "为空", value: "empty" },
  { label: "非空", value: "nonEmpty" },
];

export function RuleEdgePropertyPanel({ graphState, embedded = false }: RuleEdgePropertyPanelProps) {
  const dispatch = useAppDispatch();
  const selectedEdge = graphState.graph.edges.find((item) => item.id === graphState.selectedEdgeId) ?? null;

  if (!selectedEdge) {
    const empty = <Empty description="请选择一条连线" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    if (embedded) {
      return empty;
    }
    return <Card title="连线属性" size="small">{empty}</Card>;
  }

  const content = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div>
        <Typography.Text type="secondary">分支类型</Typography.Text>
        <Select
          value={selectedEdge.branch ?? "success"}
          options={BRANCH_OPTIONS}
          onChange={(value) => dispatch(updateRuleEdge({ edgeId: selectedEdge.id, patch: { branch: value } }))}
          style={{ width: "100%" }}
        />
      </div>
    </Space>
  );

  if (embedded) {
    return content;
  }

  return <Card title="连线属性" size="small">{content}</Card>;
}
