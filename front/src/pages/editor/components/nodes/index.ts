import type { Node } from "../../../../types/schema/node";
import { checkboxNodeDefinition } from "./checkbox";
import { containerNodeDefinition } from "./container";
import { dateNodeDefinition } from "./date";
import { detailTableNodeDefinition } from "./detailTable";
import { inputNodeDefinition } from "./input";
import { numberNodeDefinition } from "./number";
import { pageNodeDefinition } from "./page";
import { radioNodeDefinition } from "./radio";
import { relationSelectNodeDefinition } from "./relationSelect";
import { selectNodeDefinition } from "./select";
import { defaultLayoutGroup, resolveNodeComponentKey } from "./shared";
import { textareaNodeDefinition } from "./textarea";
import type { ComponentNodeDefinition, PropertyGroupSchema } from "./types";
import { uploadNodeDefinition } from "./upload";

export type {
  ComponentNodeDefinition,
  PropertyControlType,
  PropertyFieldSchema,
  PropertyFieldTarget,
  PropertyGroupSchema,
} from "./types";

const componentDefinitionsList: ComponentNodeDefinition[] = [
  pageNodeDefinition,
  inputNodeDefinition,
  textareaNodeDefinition,
  numberNodeDefinition,
  dateNodeDefinition,
  radioNodeDefinition,
  checkboxNodeDefinition,
  selectNodeDefinition,
  uploadNodeDefinition,
  containerNodeDefinition,
  detailTableNodeDefinition,
  relationSelectNodeDefinition,
];

export const componentDefinitions = Object.fromEntries(
  componentDefinitionsList.map((definition) => [definition.key, definition])
) as Record<string, ComponentNodeDefinition>;

export function getComponentTitle(componentKey: string | undefined): string {
  if (!componentKey) {
    return "未命名组件";
  }
  return componentDefinitions[componentKey]?.title ?? componentKey;
}

export function resolvePropertyGroups(node: Node): PropertyGroupSchema[] {
  if (node.type === "page") {
    return pageNodeDefinition.propertyGroups;
  }

  const componentKey = resolveNodeComponentKey(node);
  return componentDefinitions[componentKey]?.propertyGroups ?? [defaultLayoutGroup];
}

export function createPaletteNodePreset(componentKey: string) {
  const definition = componentDefinitions[componentKey];
  const props = definition?.createDefaultProps() ?? { component: componentKey, label: componentKey };

  return {
    type: componentKey === "container" ? ("container" as const) : componentKey === "detail-table" ? ("detail_table" as const) : ("field" as const),
    props,
    layout: {
      span: componentKey === "container" || componentKey === "detail-table" ? 24 : 12,
    },
  };
}

export function renderEditorNodePreview(node: Node) {
  const componentKey = node.type === "page" ? "page" : resolveNodeComponentKey(node);
  const renderer = componentDefinitions[componentKey]?.renderContent;
  return renderer ? renderer(node, "editor") : null;
}

export function renderRuntimeNodeContent(node: Node) {
  const componentKey = node.type === "page" ? "page" : resolveNodeComponentKey(node);
  const renderer = componentDefinitions[componentKey]?.renderContent;
  return renderer ? renderer(node, "runtime") : null;
}

export function getPageNodeDefinition() {
  return pageNodeDefinition;
}
