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

export function precompileInteractionRule(params: {
  ruleId: string;
  eventType: InteractionEventType;
  priority: number;
  graphState: InteractionRuleGraphState;
}): {
  diagnostics: RuleGraphDiagnostic[];
  references: RuleReferenceSummary;
  compiledRule: CompiledInteractionRule | null;
  compiledJson: Record<string, unknown>;
} {
  const triggerNodes = params.graphState.graph.nodes.filter((node) => node.type === "trigger");
  const executableNodes = params.graphState.graph.nodes.filter((node) => node.type !== "trigger");
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
  if (executableNodes.length === 0) {
    diagnostics.push({
      id: "steps_missing",
      level: "error",
      code: "steps_missing",
      message: "至少需要一个非触发器执行节点。",
    });
  }

  const triggerNode = triggerNodes[0];
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
          steps: executableNodes.map((node, index) => ({
            id: node.id,
            type: node.type,
            order: index,
            data: node.data,
          })),
          failurePolicy: "continue",
          references,
        };

  return {
    diagnostics,
    references,
    compiledRule,
    compiledJson: compiledRule
      ? {
          eventType: compiledRule.eventType,
          triggerScope: compiledRule.triggerScope,
          triggerTarget: compiledRule.triggerTarget,
          priority: compiledRule.priority,
          steps: compiledRule.steps,
          failurePolicy: compiledRule.failurePolicy,
          references: compiledRule.references,
        }
      : {},
  };
}
