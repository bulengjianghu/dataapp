import { Form, Typography } from "antd";
import type { Node } from "../../../../types/schema/node";
import type { PropertyGroupSchema } from "../nodes";
import { PropertyControlFactory } from "./PropertyControlFactory";

export function PropertyGroupRenderer({
  node,
  group,
  onFieldChange,
}: {
  node: Node;
  group: PropertyGroupSchema;
  onFieldChange: (target: "layout" | "props", key: string, value: unknown) => void;
}) {
  return (
    <section className="editor-property-group">
      <Typography.Title level={5} className="editor-property-group__title">
        {group.title}
      </Typography.Title>
      <Form layout="vertical" size="small">
        {group.fields.map((field) => (
          <Form.Item key={`${group.key}:${field.key}`} label={field.label} className="editor-property-group__item">
            <PropertyControlFactory
              node={node}
              field={field}
              onChange={(value) => onFieldChange(field.target, field.key, value)}
            />
          </Form.Item>
        ))}
      </Form>
    </section>
  );
}
