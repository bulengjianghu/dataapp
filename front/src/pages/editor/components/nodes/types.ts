import type { ReactNode } from "react";
import type { Node } from "../../../../types/schema/node";

export type PropertyControlType =
  | "input"
  | "textarea"
  | "number"
  | "switch"
  | "select"
  | "options"
  | "string-list"
  | "json"
  | "relation-display-fields"
  | "relation-filters"
  | "relation-mappings";
export type PropertyFieldTarget = "props" | "layout";

export type PropertyFieldSchema = {
  key: string;
  label: string;
  target: PropertyFieldTarget;
  control: PropertyControlType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  options?: Array<{ label: string; value: number | string }>;
};

export type PropertyGroupSchema = {
  key: string;
  title: string;
  fields: PropertyFieldSchema[];
};

type NodeRenderMode = "editor" | "runtime";

export type ComponentNodeDefinition = {
  key: string;
  title: string;
  createDefaultProps: () => Record<string, unknown>;
  propertyGroups: PropertyGroupSchema[];
  renderContent: (node: Node, mode: NodeRenderMode) => ReactNode;
  canvasTitle?: string;
  emptyText?: string;
};
