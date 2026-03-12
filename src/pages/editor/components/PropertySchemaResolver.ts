import type { Node } from "../../../types/schema/node";
import { getComponentTitle, resolvePropertyGroups } from "./componentRegistry";

export function resolveNodePropertySchema(node: Node) {
  const componentKey = typeof node.props.component === "string" ? node.props.component : node.type;

  return {
    title: getComponentTitle(componentKey),
    groups: resolvePropertyGroups(node),
  };
}
