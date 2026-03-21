import type {
  CompiledInteractionStep,
  CompiledInteractionRule,
} from "../../../store/slices/interactionRuleDraftSlice";
import type {
  InteractionRuleGraphState,
  RuleEdgeConditionItem,
  RuleGraphDiagnostic,
  RuleGraphNode,
  RuleReferenceSummary,
} from "../../../store/slices/interactionRuleGraphSlice";
import type { RuleFormFieldOption } from "./interactionRuleFormFields";
import { isInteractionEventType } from "./interactionRuleEvents";

function resolveTriggerScope(eventType: CompiledInteractionRule["eventType"]): CompiledInteractionRule["triggerScope"] {
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

function requiresTriggerTarget(eventType: CompiledInteractionRule["eventType"]) {
  return eventType === "FIELD_CHANGE_MAIN" || eventType === "FIELD_CHANGE_DETAIL";
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

function collectNodeFieldReference(node: RuleGraphNode, key: string) {
  const value = node.data[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function collectFieldReferencesFromNode(node: RuleGraphNode) {
  const references = new Set<string>();
  const push = (value: string | null) => {
    if (value) {
      references.add(value);
    }
  };

  if (node.type === "trigger") {
    push(collectNodeFieldReference(node, "triggerTarget"));
    push(collectNodeFieldReference(node, "targetField"));
  }

  if (node.type === "command") {
    const targetType = typeof node.data.targetType === "string" ? node.data.targetType.trim() : "";
    if (targetType !== "detail_table" && targetType !== "detail_row") {
      push(collectNodeFieldReference(node, "fieldKey"));
      push(collectNodeFieldReference(node, "targetField"));
    }
  }

  if (node.type === "context") {
    push(collectNodeFieldReference(node, "fieldKey"));
  }

  return Array.from(references);
}

function readTriggerTarget(node: RuleGraphNode | undefined) {
  if (!node) {
    return undefined;
  }
  return collectNodeFieldReference(node, "triggerTarget") ?? collectNodeFieldReference(node, "targetField") ?? undefined;
}

function readTriggerEventType(node: RuleGraphNode | undefined) {
  if (!node) {
    return null;
  }
  const value = node.data.eventType;
  return isInteractionEventType(value) ? value : null;
}

function isKnownFieldPath(value: unknown, availableFieldKeys: Set<string>) {
  return typeof value === "string" && value.trim().length > 0 && availableFieldKeys.has(value.trim());
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
    const normalizedData =
      node.type === "command" &&
      (node.data.commandType === "updateRow" || node.data.command === "updateRow") &&
      typeof node.data.detailTableKey === "string" &&
      node.data.detailTableKey.trim() &&
      node.data.targetType === "detail_row"
        ? {
            ...node.data,
            targetType: "detail_table",
          }
        : node.data;
    const outgoing = outgoingBySource.get(nodeId) ?? [];
    plan.push({
      id: node.id,
      type: node.type,
      data: normalizedData,
      next: outgoing.map((edge) => ({
        target: edge.target,
        flowType: edge.flowType ?? (node.type === "branch" ? "condition" : "direct"),
        conditionLogic: edge.conditionLogic ?? "and",
        conditions: Array.isArray(edge.conditions) ? edge.conditions : [],
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

function collectEdgeFieldReferences(edges: InteractionRuleGraphState["graph"]["edges"]) {
  return edges.flatMap((edge) =>
    (Array.isArray(edge.conditions) ? edge.conditions : [])
      .map((condition) => condition.fieldKey)
      .filter((fieldKey): fieldKey is string => typeof fieldKey === "string" && fieldKey.trim().length > 0)
  );
}

export function precompileInteractionRule(params: {
  ruleId: string;
  priority: number;
  graphState: InteractionRuleGraphState;
  availableFieldKeys?: string[];
  availableFields?: RuleFormFieldOption[];
}): {
  diagnostics: RuleGraphDiagnostic[];
  references: RuleReferenceSummary;
  compiledRule: CompiledInteractionRule | null;
} {
  const triggerNodes = params.graphState.graph.nodes.filter((node) => node.type === "trigger");
  const diagnostics: RuleGraphDiagnostic[] = [];
  const availableFieldKeys = new Set(params.availableFieldKeys ?? []);
  const availableFieldMap = new Map((params.availableFields ?? []).map((item) => [item.value, item]));
  const availableDetailTableKeys = new Set(
    (params.availableFields ?? [])
      .map((item) => {
        const matched = /^detail\.([^.]+)\./.exec(item.value);
        return matched?.[1] ?? null;
      })
      .filter((value): value is string => Boolean(value))
  );

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
      level: "error",
      code: "trigger_multiple",
      message: "一条规则有且只有一个触发器节点。",
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
  const triggerEventType = readTriggerEventType(triggerNode);
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

  params.graphState.graph.nodes.forEach((node) => {
    const triggerTarget = readTriggerTarget(node);
    const outgoing = params.graphState.graph.edges.filter((edge) => edge.source === node.id);

    if (node.type === "trigger" && readTriggerEventType(node) && requiresTriggerTarget(readTriggerEventType(node)! as CompiledInteractionRule["eventType"]) && !triggerTarget) {
      diagnostics.push({
        id: `trigger_target_invalid_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "trigger_target_invalid",
        message: "触发器节点必须选择触发目标字段。",
      });
    }
    if (node.type === "trigger" && !readTriggerEventType(node)) {
      diagnostics.push({
        id: `trigger_event_type_invalid_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "trigger_event_type_invalid",
        message: "触发器节点必须选择触发事件。",
      });
    }
    if (
      node.type === "trigger" &&
      triggerTarget &&
      availableFieldKeys.size > 0 &&
      !isKnownFieldPath(triggerTarget, availableFieldKeys)
    ) {
      diagnostics.push({
        id: `trigger_target_unknown_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "trigger_target_unknown",
        message: `触发器节点引用的字段已不存在：${triggerTarget}`,
      });
    }

    if (node.type !== "branch" && outgoing.length > 1) {
      diagnostics.push({
        id: `node_multi_outgoing_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "node_multi_outgoing",
        message: "非分流节点只能有一条直接流转边。",
      });
    }

    if (node.type !== "branch" && outgoing.some((edge) => (edge.flowType ?? "direct") !== "direct")) {
      diagnostics.push({
        id: `node_condition_edge_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "node_condition_edge",
        message: "只有分流节点后的连线允许配置为条件流转。",
      });
    }

    if (node.type === "command") {
      const fieldKey = typeof node.data.fieldKey === "string" ? node.data.fieldKey.trim() : "";
      const detailTableKey =
        typeof node.data.detailTableKey === "string" ? node.data.detailTableKey.trim() : "";
      const targetType = typeof node.data.targetType === "string" ? node.data.targetType.trim() : "";
      const command =
        typeof node.data.commandType === "string"
          ? node.data.commandType.trim()
          : typeof node.data.command === "string"
            ? node.data.command.trim()
            : "";
      const requiresDetailTableTarget =
        command === "appendRow" || command === "replaceTable" || command === "updateRow";
      const supportsDetailTableTarget =
        requiresDetailTableTarget || command === "setVisible" || command === "setReadonly";
      const usesDetailTableTarget =
        targetType === "detail_table" || targetType === "detail_row";
      const hasValidFieldTarget = Boolean(fieldKey);
      const hasValidDetailTableTarget = Boolean(detailTableKey);
      if ((requiresDetailTableTarget && !hasValidDetailTableTarget) || (!requiresDetailTableTarget && !hasValidFieldTarget && !hasValidDetailTableTarget)) {
        diagnostics.push({
          id: `command_target_missing_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "command_target_missing",
          message: requiresDetailTableTarget ? "该命令必须选择目标明细表。" : "命令节点必须选择操作对象。",
        });
      }
      if (!command) {
        diagnostics.push({
          id: `command_type_missing_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "command_type_missing",
          message: "命令节点必须选择命令动作。",
        });
      }
      if (!requiresDetailTableTarget && fieldKey && availableFieldKeys.size > 0 && !isKnownFieldPath(fieldKey, availableFieldKeys)) {
        diagnostics.push({
          id: `command_target_unknown_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "command_target_unknown",
          message: `命令节点引用的字段已不存在：${fieldKey}`,
        });
      }
      if (usesDetailTableTarget && detailTableKey && availableDetailTableKeys.size > 0 && !availableDetailTableKeys.has(detailTableKey)) {
        diagnostics.push({
          id: `command_detail_table_unknown_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "command_detail_table_unknown",
          message: `命令节点引用的明细表已不存在：${detailTableKey}`,
        });
      }
      if (usesDetailTableTarget && !supportsDetailTableTarget) {
        diagnostics.push({
          id: `command_detail_table_unsupported_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "command_detail_table_unsupported",
          message: "当前命令不支持直接作用于明细表，请改用字段目标或切换为明细表命令。",
        });
      }
      if (command === "updateRow") {
        const updates = Array.isArray(node.data.updates)
          ? node.data.updates.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          : [];
        if (updates.length === 0) {
          diagnostics.push({
            id: `command_update_row_updates_missing_${node.id}`,
            level: "error",
            nodeId: node.id,
            code: "command_update_row_updates_missing",
            message: "更新明细行至少需要配置一个字段更新项。",
          });
        }
        updates.forEach((item, index) => {
          if (!(typeof item.targetField === "string" && item.targetField.trim())) {
            diagnostics.push({
              id: `command_update_row_target_field_missing_${node.id}_${index}`,
              level: "warning",
              nodeId: node.id,
              code: "command_update_row_target_field_missing",
              message: "更新明细行存在未选择目标字段的更新项。",
            });
          }
        });
      }
      if (command === "setValue" && fieldKey) {
        const fieldMeta = availableFieldMap.get(fieldKey);
        const literalValue = node.data.literalValue;
        if (
          fieldMeta?.component === "number" &&
          literalValue != null &&
          String(literalValue).trim() &&
          Number.isNaN(Number(String(literalValue).trim()))
        ) {
          diagnostics.push({
            id: `command_number_literal_invalid_${node.id}`,
            level: "error",
            nodeId: node.id,
            code: "command_number_literal_invalid",
            message: "数字字段的设置值命令必须填写合法数字字面量，或改用值来源变量。",
          });
        }
      }
    }

    if (node.type === "query") {
      const sourceType =
        typeof node.data.sourceType === "string" && node.data.sourceType.trim()
          ? node.data.sourceType
          : "relation_records";
      const saveAs =
        typeof node.data.saveAs === "string" && node.data.saveAs.trim()
          ? node.data.saveAs.trim()
          : "";
      if (!saveAs) {
        diagnostics.push({
          id: `query_save_as_missing_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "query_save_as_missing",
          message: "查询节点必须填写写入变量名。",
        });
      }
      if (sourceType === "relation_records") {
        const sourceFormId =
          typeof node.data.sourceFormId === "string" && node.data.sourceFormId.trim()
            ? node.data.sourceFormId.trim()
            : "";
        if (!sourceFormId) {
          diagnostics.push({
            id: `query_source_form_missing_${node.id}`,
            level: "error",
            nodeId: node.id,
            code: "query_source_form_missing",
            message: "查询目标表单记录时，必须选择目标表单。",
          });
        }
      }
      if (sourceType === "detail_rows") {
        const detailTableKey =
          typeof node.data.detailTableKey === "string" && node.data.detailTableKey.trim()
            ? node.data.detailTableKey.trim()
            : "";
        if (!detailTableKey) {
          diagnostics.push({
            id: `query_detail_table_missing_${node.id}`,
            level: "error",
            nodeId: node.id,
            code: "query_detail_table_missing",
            message: "查询明细表行时，必须选择目标明细表。",
          });
        }
      }
    }

    if (node.type === "transform") {
      const output =
        typeof node.data.output === "string" && node.data.output.trim()
          ? node.data.output.trim()
          : typeof node.data.saveAs === "string" && node.data.saveAs.trim()
            ? node.data.saveAs.trim()
            : "";
      if (!output) {
        diagnostics.push({
          id: `transform_output_missing_${node.id}`,
          level: "error",
          nodeId: node.id,
          code: "transform_output_missing",
          message: "转换节点必须填写输出变量名。",
        });
      }
      const input =
        node.data.input != null
          ? String(node.data.input).trim()
          : typeof node.data.valueFrom === "string" && node.data.valueFrom.trim()
            ? node.data.valueFrom.trim()
            : typeof node.data.fieldKey === "string"
              ? node.data.fieldKey.trim()
              : "";
      if (!input) {
        diagnostics.push({
          id: `transform_input_missing_${node.id}`,
          level: "warning",
          nodeId: node.id,
          code: "transform_input_missing",
          message: "转换节点尚未配置输入来源，运行时可能只会输出兜底值。",
        });
      }
    }

    if (
      node.type === "context" &&
      typeof node.data.fieldKey === "string" &&
      node.data.fieldKey.trim() &&
      availableFieldKeys.size > 0 &&
      !isKnownFieldPath(node.data.fieldKey, availableFieldKeys)
    ) {
      diagnostics.push({
        id: `node_field_unknown_${node.id}`,
        level: "error",
        nodeId: node.id,
        code: "node_field_unknown",
        message: `节点引用的字段已不存在：${node.data.fieldKey}`,
      });
    }

    if (node.type === "branch") {
      outgoing.forEach((edge) => {
        if ((edge.flowType ?? "condition") !== "condition") {
          return;
        }
        const conditions = Array.isArray(edge.conditions) ? edge.conditions : [];
        if (conditions.length === 0) {
          diagnostics.push({
            id: `edge_conditions_missing_${edge.id}`,
            level: "warning",
            edgeId: edge.id,
            code: "edge_conditions_missing",
            message: "条件流转边尚未配置命中条件，运行时不会进入该子链。",
          });
        }
        conditions.forEach((condition: RuleEdgeConditionItem, index) => {
          if (!condition.fieldKey) {
            diagnostics.push({
              id: `edge_condition_field_missing_${edge.id}_${index}`,
              level: "warning",
              edgeId: edge.id,
              code: "edge_condition_field_missing",
              message: "条件流转边存在未选择字段的条件项。",
            });
            return;
          }
          if (availableFieldKeys.size > 0 && !isKnownFieldPath(condition.fieldKey, availableFieldKeys)) {
            diagnostics.push({
              id: `edge_condition_field_unknown_${edge.id}_${index}`,
              level: "error",
              edgeId: edge.id,
              code: "edge_condition_field_unknown",
              message: `条件流转边引用的字段已不存在：${condition.fieldKey}`,
            });
          }
        });
      });
    }
  });

  const references: RuleReferenceSummary = {
    fields: Array.from(
      new Set([
        ...params.graphState.graph.nodes.flatMap((node) => collectFieldReferencesFromNode(node)),
        ...collectEdgeFieldReferences(params.graphState.graph.edges),
      ])
    ),
    detailTables: collectReferenceValues(params.graphState.graph.nodes, "detailTableKey"),
    forms: collectReferenceValues(params.graphState.graph.nodes, "formCode"),
    events: triggerEventType ? [triggerEventType] : [],
  };

  const triggerTarget =
    triggerNode && triggerEventType && requiresTriggerTarget(triggerEventType)
      ? readTriggerTarget(triggerNode)
      : undefined;
  const compiledRule: CompiledInteractionRule | null =
    diagnostics.some((item) => item.level === "error") || !params.ruleId
      ? null
      : {
      ruleId: params.ruleId,
      eventType: triggerEventType!,
      triggerScope: resolveTriggerScope(triggerEventType!),
      triggerTarget,
          priority: params.priority,
          steps: plan.map(
            (step, index): CompiledInteractionStep => ({
              id: String(step.id ?? ""),
              type: step.type as CompiledInteractionStep["type"],
              data:
                step.type === "command"
                  ? {
                      ...((step.data as Record<string, unknown>) ?? {}),
                      commandType:
                        typeof (step.data as Record<string, unknown>)?.commandType === "string"
                          ? (step.data as Record<string, unknown>).commandType
                          : (step.data as Record<string, unknown>)?.command,
                    }
                  : ((step.data as Record<string, unknown>) ?? {}),
              next: Array.isArray(step.next)
                ? step.next.map((item) => ({
                    target: String((item as { target?: unknown }).target ?? ""),
                    flowType:
                      (item as { flowType?: unknown }).flowType === "condition" ? "condition" : "direct",
                    conditionLogic:
                      (item as { conditionLogic?: unknown }).conditionLogic === "or" ? "or" : "and",
                    conditions: Array.isArray((item as { conditions?: unknown[] }).conditions)
                      ? ((item as { conditions?: unknown[] }).conditions as RuleEdgeConditionItem[])
                      : [],
                  }))
                : [],
              order: index,
            })
          ),
          failurePolicy: "continue",
          references,
        };

  return {
    diagnostics,
    references,
    compiledRule,
  };
}
