import { Input, InputNumber, Select, Switch } from "antd";
import type { Node } from "../../../../types/schema/node";
import type { PropertyFieldSchema } from "../nodes";
import { RelationDisplayFieldsEditor, RelationFiltersEditor, RelationMappingsEditor } from "./RelationConfigEditor";

function readValue(node: Node, field: PropertyFieldSchema) {
  const source = (field.target === "layout" ? node.layout : node.props) as Record<string, unknown>;
  return source[field.key];
}

function serializeOptions(raw: string) {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label, index) => ({
      label,
      value: `option-${index + 1}`,
    }));
}

function serializeStringList(raw: string) {
  return raw
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean)
    .join("\n");
}

function formatJson(value: unknown) {
  if (value == null || value === "") {
    return "[]";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[]";
  }
}

function formatOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (typeof item === "object" && item !== null && typeof item.label === "string") {
        return item.label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function PropertyControlFactory({
  node,
  field,
  onChange,
}: {
  node: Node;
  field: PropertyFieldSchema;
  onChange: (value: unknown) => void;
}) {
  const value = readValue(node, field);

  if (field.control === "textarea") {
    return (
      <Input.TextArea
        rows={field.rows ?? 3}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.control === "number") {
    return (
      <InputNumber
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        style={{ width: "100%" }}
        value={typeof value === "number" ? value : null}
        onChange={(nextValue) => onChange(typeof nextValue === "number" ? nextValue : undefined)}
      />
    );
  }

  if (field.control === "switch") {
    return (
      <Switch
        checked={Boolean(value)}
        onChange={(checked) => onChange(checked)}
      />
    );
  }

  if (field.control === "select") {
    return (
      <Select
        allowClear
        options={field.options}
        placeholder={field.placeholder}
        value={typeof value === "number" || typeof value === "string" ? value : undefined}
        onChange={(nextValue) => onChange(nextValue)}
      />
    );
  }

  if (field.control === "options") {
    return (
      <Input.TextArea
        rows={6}
        placeholder={field.placeholder}
        value={formatOptions(value)}
        onChange={(event) => onChange(serializeOptions(event.target.value))}
      />
    );
  }

  if (field.control === "string-list") {
    return (
      <Input.TextArea
        rows={6}
        placeholder={field.placeholder}
        value={formatStringList(value)}
        onChange={(event) => onChange(serializeStringList(event.target.value))}
      />
    );
  }

  if (field.control === "json") {
    return (
      <Input.TextArea
        rows={8}
        placeholder={field.placeholder}
        value={formatJson(value)}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange([]);
            return;
          }
          try {
            onChange(JSON.parse(raw));
          } catch {
            onChange(value);
          }
        }}
      />
    );
  }

  if (field.control === "relation-filters") {
    return <RelationFiltersEditor node={node} value={value} onChange={onChange} />;
  }

  if (field.control === "relation-display-fields") {
    return <RelationDisplayFieldsEditor node={node} value={value} onChange={onChange} />;
  }

  if (field.control === "relation-mappings") {
    return <RelationMappingsEditor node={node} value={value} onChange={onChange} />;
  }

  return (
    <Input
      placeholder={field.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
