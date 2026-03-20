import type {
  CompiledInteractionRule,
  InteractionEventType,
} from "../../../store/slices/interactionRuleDraftSlice";
import type {
  InteractionRuleGraphState,
  RuleGraphDiagnostic,
  RuleGraphNode,
  RuleReferenceSummary,
} from "../../../store/slices/interactionRuleGraphSlice";

function resolveTriggerScope(eventType: InteractionEventType): CompiledInteractionRule["triggerScope"] {
  switch (eventType) {
    case "FIELD_CHANGE_MAIN":
      return "MAIN_FIELD";
    case "FIELD_CHANGE_DETAIL":
      return "DETAIL_ROW";
    case "FORM_INIT":
    case "DETAIL_ROW_ADDED":
    case "DETAIL_ROW_REMOVED":
    case "FORM_SUBMIT_BEFORE":
      return "RECORD";
    default:
      return "GLOBAL";
  }
}

function collectReferenceValues(nodes: RuleGraphNode[], key: string) {
  return Array.from(
    new Set(
      nodes
        .map((node) => node.data[key])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );
}

function findReachableNodeIds(graphState: InteractionRuleGraphState, startNodeId: string) {
  const visited = new Set<string>();
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    graphState.graph.edges
      .filter((edge) => edge.source === current)
      .forEach((edge) => {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      });
  }
  return visited;
}

function buildStepPlan(graphState: InteractionRuleGraphState, triggerId: string) {
  const reachable = findReachableNodeIds(graphState, triggerId);
  const outgoingBySource = new Map<string, InteractionRuleGraphState["graph"]["edges"]>();
  graphState.graph.edges.forEach((edge) => {
    const current = outgoingBySource.get(edge.source) ?? [];
    current.push(edge);
    outgoingBySource.set(edge.source, current);
  });

  const plan: Array<Record<string, unknown>> = [];
  const visited = new Set<string>([triggerId]);
  const queue = [...(outgoingBySource.get(triggerId) ?? []).map((edge) => edge.target)];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId) || !reachable.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    const node = graphState.graph.nodes.find((item) => item.id === nodeId);
    if (!node || node.type === "trigger") {
      continue;
    }
    const outgoing = outgoingBySource.get(nodeId) ?? [];
    plan.push({
      id: node.id,
      type: node.type,
      data: node.data,
      next: outgoing.map((edge) => ({
        target: edge.target,
        branch: edge.branch ?? "success",
      })),
    });
    outgoing.forEach((edge) => {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }

  return { reachable, plan };
}

export function precompileInteractionRule(params: {
  ruleId: string;
  eventType: InteractionEventType;
  priority: number;
  graphState: InteractionRuleGraphState;
}): {
  diagnostics: RuleGraphDiagnostic[];
  references: RuleReferenceSummary;
  compiledRule: CompiledInteractionRule | null;
} {
  const triggerNodes = params.graphState.graph.nodes.filter((node) => node.type === "trigger");
  const diagnostics: RuleGraphDiagnostic[] = [];

  if (triggerNodes.length === 0) {
    diagnostics.push({
      id: "trigger_missing",
      level: "error",
      code: "trigger_missing",
      message: "至少需要一个触发器节点。",
    });
  }
  if (triggerNodes.length > 1) {
    diagnostics.push({
      id: "trigger_multiple",
      level: "warning",
      code: "trigger_multiple",
      message: "当前画布存在多个触发器，发布时将以第一个触发器为准。",
    });
  }
  if (params.graphState.graph.nodes.filter((node) => node.type !== "trigger").length === 0) {
    diagnostics.push({
      id: "steps_missing",
      level: "error",
      code: "steps_missing",
      message: "至少需要一个非触发器执行节点。",
    });
  }

  const triggerNode = triggerNodes[0];
  const { reachable, plan } = triggerNode
    ? buildStepPlan(params.graphState, triggerNode.id)
    : { reachable: new Set<string>(), plan: [] };

  if (triggerNode && plan.length === 0) {
    diagnostics.push({
      id: "trigger_dead_end",
      level: "error",
      nodeId: triggerNode.id,
      code: "trigger_dead_end",
      message: "触发器没有连到任何可执行节点。",
    });
  }

  params.graphState.graph.nodes.forEach((node) => {
    if (!triggerNode || node.id === triggerNode.id) {
      return;
    }
    if (!reachable.has(node.id)) {
      diagnostics.push({
        id: `orphan_${node.id}`,
        level: "warning",
        nodeId: node.id,
        code: "orphan_node",
        message: "该节点未接入触发主链路，不会进入最终执行计划。",
      });
    }
  });

  const references: RuleReferenceSummary = {
    fields: collectReferenceValues(params.graphState.graph.nodes, "fieldKey"),
    detailTables: collectReferenceValues(params.graphState.graph.nodes, "detailTableKey"),
    forms: collectReferenceValues(params.graphState.graph.nodes, "formCode"),
    events: [params.eventType],
  };

  const triggerTarget =
    typeof triggerNode?.data.targetField === "string" ? triggerNode.data.targetField : undefined;
  const compiledRule: CompiledInteractionRule | null =
    diagnostics.some((item) => item.level === "error") || !params.ruleId
      ? null
      : {
          ruleId: params.ruleId,
          eventType: params.eventType,
          triggerScope: resolveTriggerScope(params.eventType),
          triggerTarget,
          priority: params.priority,
          steps: plan.map((step, index) => ({ ...step, order: index })),
          failurePolicy: "continue",
          references,
        };

  return {
    diagnostics,
    references,
    compiledRule,
  };
}
