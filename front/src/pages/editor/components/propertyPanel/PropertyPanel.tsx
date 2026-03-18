import { Card, Empty, Flex } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { selectFormId, selectNodesById, selectSelectedNode } from "../../../../store/selectors/editorSelectors";
import { updateNodeLayout, updateNodeProps } from "../../../../store/slices/formSchemaSlice";
import { PropertyGroupRenderer } from "./PropertyGroupRenderer";
import { resolveNodePropertySchema } from "./PropertySchemaResolver";
import { listDraftFormsOnServer } from "../../../forms/services/formList";

export function PropertyPanel() {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const currentFormId = useAppSelector(selectFormId);
  const nodesById = useAppSelector(selectNodesById);
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
    const parentNode = selectedNode.parentId ? nodesById[selectedNode.parentId] : null;
    const isDetailColumn = selectedNode.type === "field" && parentNode?.type === "detail_table";

    const groups = resolved.groups
      .map((group) => {
        if (!isDetailColumn && group.key !== "layout") {
          return group;
        }

        if (isDetailColumn && group.key === "layout") {
          return {
            ...group,
            title: "列布局",
            fields: [
              {
                key: "columnWidth",
                label: "列宽",
                target: "props" as const,
                control: "number" as const,
                min: 80,
                max: 600,
                step: 10,
              },
            ],
          };
        }

        return group;
      })
      .filter((group) => !(isDetailColumn && group.key === "relation-select-display"));

    if (selectedNode.props.component !== "relation-select") {
      return {
        ...resolved,
        groups,
      };
    }

    return {
      ...resolved,
      groups: groups.map((group) => ({
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
  }, [formOptions, nodesById, selectedNode]);

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
