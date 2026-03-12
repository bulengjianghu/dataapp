import { Card, Empty, Flex, Tag, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectDirty, selectSelectedNode } from "../../../store/selectors/editorSelectors";
import { updateNodeLayout, updateNodeProps } from "../../../store/slices/formSchemaSlice";
import { PropertyGroupRenderer } from "./PropertyGroupRenderer";
import { resolveNodePropertySchema } from "./PropertySchemaResolver";

export function PropertyPanel() {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const dirty = useAppSelector(selectDirty);

  const schema = selectedNode ? resolveNodePropertySchema(selectedNode) : null;

  return (
    <Card title="属性面板" size="small">
      <div className="editor-property-panel__body">
        {selectedNode && schema ? (
          <Flex vertical gap={16}>
            <Flex align="center" justify="space-between">
              <div>
                <Typography.Text strong>{schema.title}</Typography.Text>
                <Typography.Paragraph type="secondary" className="editor-property-panel__meta">
                  当前节点: {selectedNode.id}
                </Typography.Paragraph>
              </div>
              <Tag color={dirty ? "orange" : "green"}>{dirty ? "未保存" : "已保存"}</Tag>
            </Flex>

            {schema.groups.map((group) => (
              <PropertyGroupRenderer
                key={group.key}
                node={selectedNode}
                group={group}
                onFieldChange={(target, key, value) => {
                  if (target === "layout") {
                    dispatch(updateNodeLayout({ nodeId: selectedNode.id, patch: { [key]: value } }));
                    return;
                  }

                  dispatch(updateNodeProps({ nodeId: selectedNode.id, patch: { [key]: value } }));
                }}
              />
            ))}
          </Flex>
        ) : (
          <div className="editor-property-panel__empty">
            <Empty description="请选择画布中的组件后再编辑属性" />
          </div>
        )}
      </div>
    </Card>
  );
}
