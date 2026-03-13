import { Card, Empty, Flex } from "antd";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { selectDirty, selectSelectedNode } from "../../../../store/selectors/editorSelectors";
import { updateNodeLayout, updateNodeProps } from "../../../../store/slices/formSchemaSlice";
import { PropertyGroupRenderer } from "./PropertyGroupRenderer";
import { resolveNodePropertySchema } from "./PropertySchemaResolver";

export function PropertyPanel() {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const dirty = useAppSelector(selectDirty);

  const schema = selectedNode ? resolveNodePropertySchema(selectedNode) : null;

  return (
    <Card title="属性面板" size="small" className="editor-property-panel">
      <div className="editor-property-panel__body">
        {selectedNode && schema ? (
          <Flex vertical gap={16}>
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
