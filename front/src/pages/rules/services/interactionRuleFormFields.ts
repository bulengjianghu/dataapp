import type { Node, NodesById } from "../../../types/schema/node";
import { loadDraftFromServer } from "../../editor/services/formPersistence";

export type RuleFormFieldOption = {
  label: string;
  value: string;
  scopeLabel: string;
  component?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
};

function isFieldNode(node: Node) {
  return node.type === "field";
}

function getNodeLabel(node: Node) {
  if (typeof node.props.label === "string" && node.props.label.trim()) {
    return node.props.label.trim();
  }
  if (typeof node.props.title === "string" && node.props.title.trim()) {
    return node.props.title.trim();
  }
  return node.id;
}

function findDetailTableAncestor(node: Node, nodesById: NodesById): Node | null {
  let currentParentId = node.parentId;
  while (currentParentId) {
    const parent = nodesById[currentParentId];
    if (!parent) {
      return null;
    }
    if (parent.type === "detail_table") {
      return parent;
    }
    currentParentId = parent.parentId;
  }
  return null;
}

export function buildInteractionRuleFieldOptions(nodesById: NodesById) {
  return Object.values(nodesById)
    .filter((node) => isFieldNode(node))
    .map((node) => {
      const serverId = typeof node.serverId === "string" && node.serverId.trim() ? node.serverId.trim() : node.id;
      const detailTable = findDetailTableAncestor(node, nodesById);
      const path = detailTable
        ? `detail.${typeof detailTable.serverId === "string" && detailTable.serverId.trim() ? detailTable.serverId.trim() : detailTable.id}.${serverId}`
        : `main.${serverId}`;
      const scopeLabel = detailTable ? `明细表 / ${getNodeLabel(detailTable)}` : "主表";
      const component = typeof node.props.component === "string" ? node.props.component : undefined;
      const options =
        Array.isArray(node.props.options) && (
          component === "select" ||
          component === "radio" ||
          component === "checkbox"
        )
          ? node.props.options
              .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
              .map((item) => ({
                label: typeof item.label === "string" ? item.label : String(item.value ?? ""),
                value: String(item.value ?? ""),
              }))
          : undefined;
      return {
        label: `${getNodeLabel(node)} (${path})`,
        value: path,
        scopeLabel,
        component,
        options,
      } satisfies RuleFormFieldOption;
    })
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

export async function loadInteractionRuleFieldOptions(formId: string) {
  const draft = await loadDraftFromServer(formId);
  return buildInteractionRuleFieldOptions(draft.nodesById);
}
