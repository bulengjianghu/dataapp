import { Card, Descriptions, Empty } from "antd";
import { useAppSelector } from "../../../store/hooks";
import { selectDirty, selectSelectedNodeKey } from "../../../store/selectors/editorSelectors";

export function PropertyPanel() {
  const selectedNodeKey = useAppSelector(selectSelectedNodeKey);
  const dirty = useAppSelector(selectDirty);

  return (
    <Card title="属性面板" size="small">
      <div
        style={{
          minHeight: "calc(100vh - 180px)",
        }}
      >
        {selectedNodeKey ? (
          <Descriptions
            size="small"
            column={1}
            items={[
              { key: "selected", label: "当前选中", children: selectedNodeKey },
              { key: "dirty", label: "保存状态", children: dirty ? "未保存" : "已保存" },
              { key: "tip", label: "说明", children: "Sprint 1 占位：Sprint 3 接入动态配置项" },
            ]}
          />
        ) : (
          <div style={{ display: "grid", placeItems: "center", minHeight: "calc(100vh - 220px)" }}>
            <Empty description="Sprint 1 占位：未选择组件" />
          </div>
        )}
      </div>
    </Card>
  );
}
