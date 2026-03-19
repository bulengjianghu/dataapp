import { Card, Tag, Typography } from "antd";
import type { RuleNodeType } from "../../../store/slices/interactionRuleGraphSlice";

type RulePaletteProps = {
  items: Array<{
    type: RuleNodeType;
    label: string;
    description: string;
    accent: string;
  }>;
  onAdd: (type: RuleNodeType) => void;
};

export function RulePalette({ items, onAdd }: RulePaletteProps) {
  return (
    <Card title="节点面板" size="small">
      <div className="rule-palette">
        {items.map((item) => (
          <button
            key={item.type}
            type="button"
            className="rule-palette__item"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/dataapp-rule-node", item.type);
              event.dataTransfer.setData("application/reactflow", item.type);
              event.dataTransfer.setData("text/plain", item.type);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAdd(item.type)}
          >
            <span className="rule-palette__accent" style={{ background: item.accent }} />
            <span className="rule-palette__content">
              <span className="rule-palette__header">
                <Typography.Text strong>{item.label}</Typography.Text>
                <Tag bordered={false}>{item.type}</Tag>
              </span>
              <Typography.Text type="secondary">{item.description}</Typography.Text>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
