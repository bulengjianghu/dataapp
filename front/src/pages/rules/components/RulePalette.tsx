import { Card, Tag, Typography } from "antd";
import type { RuleNodeType } from "../../../store/slices/interactionRuleGraphSlice";

type RulePaletteProps = {
  items: Array<{
    key: string;
    type: RuleNodeType;
    label: string;
    description: string;
    accent: string;
    group: "基础" | "命令";
    tagLabel?: string;
    presetData?: Record<string, unknown>;
  }>;
  onAdd: (item: RulePaletteProps["items"][number]) => void;
};

export function RulePalette({ items, onAdd }: RulePaletteProps) {
  const groups: Array<RulePaletteProps["items"][number]["group"]> = ["基础", "命令"];

  return (
    <Card title="节点面板" size="small">
      <div className="rule-palette">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) {
            return null;
          }
          return (
            <div key={group}>
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                {group}
              </Typography.Title>
              <div className="rule-palette">
                {groupItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="rule-palette__item"
                    draggable
                    onDragStart={(event) => {
                      const payload = JSON.stringify({
                        type: item.type,
                        presetData: item.presetData ?? null,
                      });
                      event.dataTransfer.setData("application/dataapp-rule-node", payload);
                      event.dataTransfer.setData("application/reactflow", payload);
                      event.dataTransfer.setData("text/plain", payload);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onAdd(item)}
                  >
                    <span className="rule-palette__accent" style={{ background: item.accent }} />
                    <span className="rule-palette__content">
                      <span className="rule-palette__header">
                        <Typography.Text strong>{item.label}</Typography.Text>
                        <Tag bordered={false}>{item.tagLabel ?? item.type}</Tag>
                      </span>
                      <Typography.Text type="secondary">{item.description}</Typography.Text>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
