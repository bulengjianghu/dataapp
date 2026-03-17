import { Card, Empty, Flex } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { selectFormId, selectSelectedNode } from "../../../../store/selectors/editorSelectors";
import { updateNodeLayout, updateNodeProps } from "../../../../store/slices/formSchemaSlice";
import { PropertyGroupRenderer } from "./PropertyGroupRenderer";
import { resolveNodePropertySchema } from "./PropertySchemaResolver";
import { listDraftFormsOnServer } from "../../../forms/services/formList";

export function PropertyPanel() {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const currentFormId = useAppSelector(selectFormId);
  const [formOptions, setFormOptions] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    void listDraftFormsOnServer()
      .then((items) => {
        setFormOptions(
          items
            .filter((item) => item.formId !== currentFormId)
            .map((item) => ({ label: item.name, value: item.formId }))
        );
      })
      .catch(() => {
        setFormOptions([]);
      });
  }, [currentFormId]);

  const schema = useMemo(() => {
    if (!selectedNode) {
      return null;
    }
    const resolved = resolveNodePropertySchema(selectedNode);
    if (selectedNode.props.component !== "relation-select") {
      return resolved;
    }

    return {
      ...resolved,
      groups: resolved.groups.map((group) => ({
        ...group,
        fields: group.fields.map((field) =>
          field.key === "sourceFormId"
            ? {
                ...field,
                options: formOptions,
              }
            : field
        ),
      })),
    };
  }, [formOptions, selectedNode]);

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
