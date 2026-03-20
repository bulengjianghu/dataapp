import { request } from "../../../services/api";
import type { NodesById } from "../../../types/schema/node";
import type { AppDispatch, RootState } from "../../../store";
import {
  appendEngineDiagnostic,
  appendExecutionTrace,
  dequeueRuntimeEvent,
  enqueueRuntimeEvent,
  finishRuleExecution,
  startRuleExecution,
  type RuntimeEvent,
} from "../../../store/slices/interactionEngineSlice";
import {
  appendDetailRows,
  applyComponentExtensionState,
  applyDetailColumnDerivedState,
  applyFieldDerivedState,
  createDetailRowRuntime,
  type DetailRowRuntime,
  initializeInteractionRuntime,
  normalizeDetailRows,
  setDetailFieldValue,
  setMainFieldValue,
  type RuntimeFieldState,
  type RuntimeOption,
} from "../../../store/slices/interactionRuntimeSlice";

export type InteractionRuntimeRule = {
  ruleId: number;
  versionId: number;
  versionNo: number;
  ruleCode: string;
  ruleName: string;
  eventType: RuntimeEvent["eventType"];
  priority: number;
  triggerScope: "MAIN_FIELD" | "DETAIL_ROW" | "RECORD" | "GLOBAL" | "";
  triggerTarget: string;
  failurePolicy: "interrupt" | "continue" | "fallback" | string;
  compilerVersion: string;
  normalizedJson: Record<string, unknown>;
};

type RuntimeCommandTarget = {
  targetType: "main_field" | "detail_field" | "detail_column" | "detail_table";
  fieldKey?: string;
  detailTableKey?: string;
  rowId?: string;
};

type RuntimeCommand = {
  commandType: string;
  target: RuntimeCommandTarget;
  value?: unknown;
  emitEventAfterCommand?: boolean;
};

type RuleExecutionContext = {
  executionId: string;
  ruleId: string;
  event: RuntimeEvent;
  temp: Record<string, unknown>;
  runtimeState: RootState["interactionRuntime"];
};

function createEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createExecutionId() {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFieldPath(fieldKey: string) {
  if (fieldKey.startsWith("main.")) {
    return fieldKey.slice(5);
  }
  if (fieldKey.startsWith("detail.")) {
    return fieldKey.slice(7);
  }
  return fieldKey;
}

function normalizeBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return Boolean(value);
}

function isRelationFieldState(
  fieldState: RuntimeFieldState | undefined
): fieldState is Extract<RuntimeFieldState, { componentType: "relation-select" }> {
  return fieldState?.componentType === "relation-select";
}

function readFieldState(component: string, props: Record<string, unknown>): RuntimeFieldState {
  const baseState = {
    componentType: component,
    visible: props.hidden !== true,
    readonly: props.readonly === true,
    required: props.required === true,
    disabled: props.disabled === true,
    hint: typeof props.helpText === "string" ? props.helpText : undefined,
    winnerRuleIds: [],
  };

  if (component === "select" || component === "radio" || component === "checkbox") {
    return {
      ...baseState,
      componentType: component,
      select: {
        options: Array.isArray(props.options)
          ? props.options
              .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
              .map((item) => ({
                label: typeof item.label === "string" ? item.label : String(item.value ?? ""),
                value: String(item.value ?? ""),
                raw: item as Record<string, unknown>,
              }))
          : [],
      },
    };
  }

  if (component === "relation-select") {
    return {
      ...baseState,
      componentType: "relation-select",
      relation: {
        options: [],
        sourceFormId: typeof props.sourceFormId === "number" ? String(props.sourceFormId) : undefined,
        displayFields: Array.isArray(props.displayFields)
          ? props.displayFields.filter((item): item is string => typeof item === "string")
          : [],
      },
    };
  }

  return baseState;
}

export function createInitialInteractionRuntimePayload(
  nodesById: NodesById,
  initialData: {
    mainData: Record<string, unknown>;
    detailTables: Record<string, Array<Record<string, unknown> | DetailRowRuntime>>;
  }
) {
  const fields: Record<string, RuntimeFieldState> = {};
  const detailTables: RootState["interactionRuntime"]["componentState"]["detailTables"] = {};

  Object.values(nodesById).forEach((node) => {
    if (node.type === "field" && typeof node.serverId === "string" && node.serverId) {
      const component = typeof node.props.component === "string" ? node.props.component : "input";
      fields[node.serverId] = readFieldState(component, node.props);
    }
    if (node.type === "detail_table" && typeof node.serverId === "string" && node.serverId) {
      const columns: Record<string, RuntimeFieldState> = {};
      node.childrenIds.forEach((childId) => {
        const childNode = nodesById[childId];
        if (!childNode || childNode.type !== "field" || typeof childNode.serverId !== "string" || !childNode.serverId) {
          return;
        }
        const component = typeof childNode.props.component === "string" ? childNode.props.component : "input";
        columns[childNode.serverId] = readFieldState(component, childNode.props);
      });
      detailTables[node.serverId] = {
        visible: node.props.hidden !== true,
        readonly: node.props.readonly === true,
        columns,
      };
    }
  });

  return {
    data: {
      mainData: { ...(initialData.mainData ?? {}) },
      detailTables: Object.fromEntries(
        Object.entries(initialData.detailTables ?? {}).map(([detailTableKey, rows]) => [
          detailTableKey,
          normalizeDetailRows(rows),
        ])
      ),
    },
    componentState: {
      fields,
      detailTables,
    },
  };
}

export function initializeInteractionRuntimeFromRecord(
  dispatch: AppDispatch,
  nodesById: NodesById,
  initialData: {
    mainData: Record<string, unknown>;
    detailTables: Record<string, Array<Record<string, unknown> | DetailRowRuntime>>;
  }
) {
  dispatch(initializeInteractionRuntime(createInitialInteractionRuntimePayload(nodesById, initialData)));
}

export function createFormInitRuntimeEvent(): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "FORM_INIT",
    scope: "RECORD",
    payload: {},
    source: "system",
    createdAt: Date.now(),
  };
}

export function createMainFieldChangeRuntimeEvent(
  fieldKey: string,
  value: unknown,
  source: RuntimeEvent["source"]
): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "FIELD_CHANGE_MAIN",
    target: `main.${fieldKey}`,
    scope: "MAIN_FIELD",
    payload: {
      fieldKey,
      value,
    },
    source,
    createdAt: Date.now(),
  };
}

export function createDetailFieldChangeRuntimeEvent(params: {
  detailTableKey: string;
  rowId: string;
  fieldKey: string;
  value: unknown;
  source: RuntimeEvent["source"];
}): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "FIELD_CHANGE_DETAIL",
    target: `detail.${params.fieldKey}`,
    scope: "DETAIL_ROW",
    payload: {
      detailTableKey: params.detailTableKey,
      rowId: params.rowId,
      fieldKey: params.fieldKey,
      value: params.value,
    },
    source: params.source,
    createdAt: Date.now(),
  };
}

export function createDetailRowAddedRuntimeEvent(
  detailTableKey: string,
  rowId: string,
  source: RuntimeEvent["source"]
): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "DETAIL_ROW_ADDED",
    target: detailTableKey,
    scope: "DETAIL_ROW",
    payload: { detailTableKey, rowId },
    source,
    createdAt: Date.now(),
  };
}

export function createDetailRowRemovedRuntimeEvent(
  detailTableKey: string,
  rowId: string,
  source: RuntimeEvent["source"]
): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "DETAIL_ROW_REMOVED",
    target: detailTableKey,
    scope: "DETAIL_ROW",
    payload: { detailTableKey, rowId },
    source,
    createdAt: Date.now(),
  };
}

export function createRelationOpenRuntimeEvent(params: {
  fieldKey: string;
  detailTableKey?: string;
  rowId?: string;
  source: RuntimeEvent["source"];
}): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "RELATION_OPEN",
    target: params.fieldKey,
    scope: params.detailTableKey ? "DETAIL_ROW" : "MAIN_FIELD",
    payload: params,
    source: params.source,
    createdAt: Date.now(),
  };
}

export function createRelationSelectedRuntimeEvent(params: {
  fieldKey: string;
  selectedRecordId: number | string;
  selectedRecord: Record<string, unknown>;
  detailTableKey?: string;
  rowId?: string;
  source: RuntimeEvent["source"];
}): RuntimeEvent {
  return {
    eventId: createEventId(),
    eventType: "RELATION_SELECTED",
    target: params.fieldKey,
    scope: params.detailTableKey ? "DETAIL_ROW" : "MAIN_FIELD",
    payload: params,
    source: params.source,
    createdAt: Date.now(),
  };
}

export async function loadPublishedInteractionRuntimeRules(formId: number, formVersionId?: number | null) {
  const search = typeof formVersionId === "number" ? `?formVersionId=${formVersionId}` : "";
  return request<InteractionRuntimeRule[]>(`/api/runtime/forms/${formId}/interaction-rules${search}`);
}

function resolveRuntimeValue(path: unknown, context: RuleExecutionContext) {
  if (typeof path !== "string" || !path.trim()) {
    return undefined;
  }
  if (path.startsWith("temp.")) {
    return context.temp[path.slice(5)];
  }
  if (path.startsWith("event.")) {
    return context.event.payload[path.slice(6)];
  }
  if (path.startsWith("main.")) {
    return context.runtimeState.data.mainData[normalizeFieldPath(path)];
  }
  if (path.startsWith("detail.")) {
    const detailTableKey = typeof context.event.payload.detailTableKey === "string" ? context.event.payload.detailTableKey : "";
    const rowId = typeof context.event.payload.rowId === "string" ? context.event.payload.rowId : "";
    const row = context.runtimeState.data.detailTables[detailTableKey]?.find((item) => item.__rowId === rowId);
    return row?.values[normalizeFieldPath(path)];
  }
  return context.runtimeState.data.mainData[path] ?? context.temp[path];
}

function matchRule(rule: InteractionRuntimeRule, event: RuntimeEvent) {
  if (rule.eventType !== event.eventType) {
    return false;
  }
  if (!rule.triggerTarget) {
    return true;
  }
  if (!event.target) {
    return false;
  }
  return rule.triggerTarget === event.target || normalizeFieldPath(rule.triggerTarget) === normalizeFieldPath(event.target);
}

function resolveNextTarget(
  step: Record<string, unknown>,
  branch: "success" | "failure" | "true" | "false" | "empty" | "nonEmpty" = "success"
) {
  const next = Array.isArray(step.next) ? step.next : [];
  const matched = next.find(
    (item): item is { target?: unknown; branch?: unknown } =>
      typeof item === "object" && item !== null && (item.branch === branch || (branch === "success" && item.branch == null))
  );
  if (typeof matched?.target === "string" && matched.target) {
    return matched.target;
  }
  if (branch !== "success") {
    const fallback = next.find(
      (item): item is { target?: unknown } => typeof item === "object" && item !== null && item.branch === "success"
    );
    if (typeof fallback?.target === "string" && fallback.target) {
      return fallback.target;
    }
  }
  return undefined;
}

function executeConditionStep(step: Record<string, unknown>, context: RuleExecutionContext) {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const leftValue = resolveRuntimeValue(data.leftOperand ?? data.fieldKey, context);
  const rightValue = data.rightOperand ?? data.expectedValue ?? data.literalValue ?? data.value;
  const operator = typeof data.operator === "string" ? data.operator : "eq";

  let matched = false;
  switch (operator) {
    case "isEmpty":
      matched = leftValue === undefined || leftValue === null || leftValue === "";
      break;
    case "ne":
      matched = leftValue !== rightValue;
      break;
    case "contains":
      matched = Array.isArray(leftValue)
        ? leftValue.includes(rightValue)
        : String(leftValue ?? "").includes(String(rightValue ?? ""));
      break;
    case "gt":
      matched = Number(leftValue ?? 0) > Number(rightValue ?? 0);
      break;
    case "gte":
      matched = Number(leftValue ?? 0) >= Number(rightValue ?? 0);
      break;
    case "lt":
      matched = Number(leftValue ?? 0) < Number(rightValue ?? 0);
      break;
    case "lte":
      matched = Number(leftValue ?? 0) <= Number(rightValue ?? 0);
      break;
    case "eq":
    default:
      matched = leftValue === rightValue;
      break;
  }

  return {
    nextNodeId: resolveNextTarget(step, matched ? "true" : "false"),
    outputSummary: matched ? "条件命中" : "条件未命中",
  };
}

function writeTempValue(context: RuleExecutionContext, saveAs: string, value: unknown) {
  if (!saveAs.trim()) {
    return;
  }
  context.temp[saveAs.replace(/^temp\./, "")] = value;
}

function executeContextLikeStep(
  step: Record<string, unknown>,
  context: RuleExecutionContext,
  stepLabel: "context" | "query" | "transform"
) {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const saveAs = typeof data.saveAs === "string" ? data.saveAs : "";
  const resolvedValue =
    resolveRuntimeValue(data.valueFrom ?? data.fieldKey ?? data.targetField, context) ?? data.literalValue;

  if (!saveAs) {
    return {
      nextNodeId: resolveNextTarget(step, "success"),
      outputSummary: `${stepLabel} 未配置 saveAs，已跳过`,
    };
  }

  writeTempValue(context, saveAs, resolvedValue);
  return {
    nextNodeId: resolveNextTarget(step, "success"),
    outputSummary: `写入临时变量 ${saveAs}`,
  };
}

function resolveCommandTarget(
  data: Record<string, unknown>,
  context: RuleExecutionContext
): RuntimeCommandTarget | null {
  const fieldKey = normalizeFieldPath(
    typeof data.fieldKey === "string"
      ? data.fieldKey
      : typeof data.targetField === "string"
        ? data.targetField
        : ""
  );
  const targetType = typeof data.targetType === "string" ? data.targetType : "";
  const detailTableKey =
    typeof data.detailTableKey === "string"
      ? data.detailTableKey
      : typeof context.event.payload.detailTableKey === "string"
        ? context.event.payload.detailTableKey
        : undefined;
  const rowId =
    typeof data.rowId === "string"
      ? data.rowId
      : typeof context.event.payload.rowId === "string"
        ? context.event.payload.rowId
        : undefined;

  if (targetType === "detail_table" && detailTableKey) {
    return { targetType: "detail_table", detailTableKey };
  }
  if (targetType === "detail_column" && detailTableKey && fieldKey) {
    return { targetType: "detail_column", detailTableKey, fieldKey };
  }
  if ((targetType === "detail_field" || context.event.scope === "DETAIL_ROW") && detailTableKey && rowId && fieldKey) {
    return { targetType: "detail_field", detailTableKey, rowId, fieldKey };
  }
  if (fieldKey) {
    return { targetType: "main_field", fieldKey };
  }
  return null;
}

function executeCommandStep(
  step: Record<string, unknown>,
  context: RuleExecutionContext
): { nextNodeId?: string; commands: RuntimeCommand[]; outputSummary: string } {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const commandType = typeof data.commandType === "string" ? data.commandType : typeof data.command === "string" ? data.command : "";
  const target = resolveCommandTarget(data, context);
  const value = data.valueFrom != null ? resolveRuntimeValue(data.valueFrom, context) : data.literalValue ?? data.value;

  if (!commandType || !target) {
    return {
      nextNodeId: resolveNextTarget(step, "failure"),
      commands: [],
      outputSummary: "命令缺少目标字段或命令类型",
    };
  }

  return {
    nextNodeId: resolveNextTarget(step, "success"),
    commands: [
      {
        commandType,
        target,
        value,
        emitEventAfterCommand: data.emitEventAfterCommand === true,
      },
    ],
    outputSummary: `${commandType} -> ${target.targetType}:${target.fieldKey ?? target.detailTableKey ?? ""}`,
  };
}

function dispatchRuntimeCommand(
  dispatch: AppDispatch,
  getState: () => RootState,
  command: RuntimeCommand
) {
  const { target } = command;
  const state = getState();

  switch (command.commandType) {
    case "setVisible":
      if (target.targetType === "detail_table" && target.detailTableKey) {
        dispatch(
          applyDetailColumnDerivedState({
            detailTableKey: target.detailTableKey,
            tablePatch: { visible: normalizeBooleanValue(command.value) },
          })
        );
      } else if (target.targetType === "detail_column" && target.detailTableKey && target.fieldKey) {
        dispatch(
          applyDetailColumnDerivedState({
            detailTableKey: target.detailTableKey,
            fieldKey: target.fieldKey,
            fieldPatch: { visible: normalizeBooleanValue(command.value) },
          })
        );
      } else if (target.fieldKey) {
        dispatch(applyFieldDerivedState({ fieldKey: target.fieldKey, patch: { visible: normalizeBooleanValue(command.value) } }));
      }
      break;
    case "setReadonly":
      if (target.targetType === "detail_table" && target.detailTableKey) {
        dispatch(
          applyDetailColumnDerivedState({
            detailTableKey: target.detailTableKey,
            tablePatch: { readonly: normalizeBooleanValue(command.value) },
          })
        );
      } else if (target.targetType === "detail_column" && target.detailTableKey && target.fieldKey) {
        dispatch(
          applyDetailColumnDerivedState({
            detailTableKey: target.detailTableKey,
            fieldKey: target.fieldKey,
            fieldPatch: { readonly: normalizeBooleanValue(command.value) },
          })
        );
      } else if (target.fieldKey) {
        dispatch(applyFieldDerivedState({ fieldKey: target.fieldKey, patch: { readonly: normalizeBooleanValue(command.value) } }));
      }
      break;
    case "setRequired":
      if (target.targetType === "detail_column" && target.detailTableKey && target.fieldKey) {
        dispatch(
          applyDetailColumnDerivedState({
            detailTableKey: target.detailTableKey,
            fieldKey: target.fieldKey,
            fieldPatch: { required: normalizeBooleanValue(command.value) },
          })
        );
      } else if (target.fieldKey) {
        dispatch(applyFieldDerivedState({ fieldKey: target.fieldKey, patch: { required: normalizeBooleanValue(command.value) } }));
      }
      break;
    case "setOptions":
      if (!Array.isArray(command.value) || !target.fieldKey) {
        break;
      }
      const currentFieldState = state.interactionRuntime.componentState.fields[target.fieldKey];
      if (isRelationFieldState(currentFieldState)) {
        dispatch(
          applyComponentExtensionState({
            fieldKey: target.fieldKey,
            patch: {
              relation: {
                ...(currentFieldState.relation ?? { options: [] }),
                options: command.value as RuntimeOption[],
              },
            } as Partial<RuntimeFieldState>,
          })
        );
      } else {
        dispatch(
          applyComponentExtensionState({
            fieldKey: target.fieldKey,
            patch: {
              select: {
                options: command.value as RuntimeOption[],
              },
            } as Partial<RuntimeFieldState>,
          })
        );
      }
      break;
    case "setFilter":
      if (target.fieldKey) {
        const currentField = state.interactionRuntime.componentState.fields[target.fieldKey];
        if (isRelationFieldState(currentField)) {
          dispatch(
            applyComponentExtensionState({
              fieldKey: target.fieldKey,
              patch: {
                relation: {
                  ...(currentField.relation ?? { options: [] }),
                  filter:
                    typeof command.value === "object" && command.value !== null
                      ? (command.value as Record<string, unknown>)
                      : undefined,
                },
              } as Partial<RuntimeFieldState>,
            })
          );
        }
      }
      break;
    case "appendRow":
      if (target.detailTableKey && command.value && typeof command.value === "object" && !Array.isArray(command.value)) {
        dispatch(
          appendDetailRows({
            detailTableKey: target.detailTableKey,
            rows: [createDetailRowRuntime(command.value as Record<string, unknown>, { __origin: "relation_fill" })],
          })
        );
      }
      break;
    case "clearValue":
      if (target.targetType === "detail_field" && target.detailTableKey && target.rowId && target.fieldKey) {
        dispatch(setDetailFieldValue({ detailTableKey: target.detailTableKey, rowId: target.rowId, fieldKey: target.fieldKey, value: undefined }));
      } else if (target.fieldKey) {
        dispatch(setMainFieldValue({ fieldKey: target.fieldKey, value: undefined }));
      }
      break;
    case "setValue":
    default:
      if (target.targetType === "detail_field" && target.detailTableKey && target.rowId && target.fieldKey) {
        dispatch(setDetailFieldValue({ detailTableKey: target.detailTableKey, rowId: target.rowId, fieldKey: target.fieldKey, value: command.value }));
      } else if (target.fieldKey) {
        dispatch(setMainFieldValue({ fieldKey: target.fieldKey, value: command.value }));
      }
      break;
  }

  if (!command.emitEventAfterCommand) {
    return;
  }

  const nextState = getState().interactionRuntime;
  if (target.targetType === "detail_field" && target.detailTableKey && target.rowId && target.fieldKey) {
    const row = nextState.data.detailTables[target.detailTableKey]?.find((item) => item.__rowId === target.rowId);
    dispatch(
      enqueueRuntimeEvent(
        createDetailFieldChangeRuntimeEvent({
          detailTableKey: target.detailTableKey,
          rowId: target.rowId,
          fieldKey: target.fieldKey,
          value: row?.values[target.fieldKey],
          source: "rule",
        })
      )
    );
    return;
  }
  if (target.fieldKey) {
    dispatch(
      enqueueRuntimeEvent(
        createMainFieldChangeRuntimeEvent(target.fieldKey, nextState.data.mainData[target.fieldKey] ?? command.value, "rule")
      )
    );
  }
}

export function processNextRuntimeEvent(params: {
  dispatch: AppDispatch;
  getState: () => RootState;
  rules: InteractionRuntimeRule[];
}) {
  const { dispatch, getState, rules } = params;
  const event = getState().interactionEngine.pendingEvents[0];
  if (!event) {
    return;
  }

  const matchedRules = rules.filter((rule) => matchRule(rule, event));
  matchedRules.forEach((rule) => {
    const executionId = createExecutionId();
    const startedAt = Date.now();
    dispatch(startRuleExecution({ executionId, ruleId: String(rule.ruleId), eventId: event.eventId, startedAt }));

    try {
      const normalized = rule.normalizedJson;
      const steps = Array.isArray(normalized.steps)
        ? normalized.steps.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];
      const stepsById = new Map(
        steps
          .map((step) => (typeof step.id === "string" ? [step.id, step] : null))
          .filter((item): item is [string, Record<string, unknown>] => Array.isArray(item))
      );
      const context: RuleExecutionContext = {
        executionId,
        ruleId: String(rule.ruleId),
        event,
        temp: {},
        runtimeState: getState().interactionRuntime,
      };

      let currentStep: Record<string, unknown> | undefined = steps[0];
      while (currentStep) {
        context.runtimeState = getState().interactionRuntime;
        const stepId = typeof currentStep.id === "string" ? currentStep.id : "";
        const stepType = typeof currentStep.type === "string" ? currentStep.type : "notice";
        const inputSummary =
          typeof currentStep.data === "object" && currentStep.data
            ? JSON.stringify(currentStep.data)
            : undefined;

        let nextNodeId: string | undefined;
        let outputSummary = "已执行";
        let commands: RuntimeCommand[] = [];

        if (stepType === "condition") {
          const result = executeConditionStep(currentStep, context);
          nextNodeId = result.nextNodeId;
          outputSummary = result.outputSummary;
        } else if (stepType === "context") {
          const result = executeContextLikeStep(currentStep, context, "context");
          nextNodeId = result.nextNodeId;
          outputSummary = result.outputSummary;
        } else if (stepType === "query") {
          const result = executeContextLikeStep(currentStep, context, "query");
          nextNodeId = result.nextNodeId;
          outputSummary = result.outputSummary;
        } else if (stepType === "transform") {
          const result = executeContextLikeStep(currentStep, context, "transform");
          nextNodeId = result.nextNodeId;
          outputSummary = result.outputSummary;
        } else if (stepType === "command") {
          const result = executeCommandStep(currentStep, context);
          nextNodeId = result.nextNodeId;
          outputSummary = result.outputSummary;
          commands = result.commands;
        } else {
          nextNodeId = resolveNextTarget(currentStep, "success");
        }

        dispatch(
          appendExecutionTrace({
            executionId,
            ruleId: String(rule.ruleId),
            nodeId: stepId,
            nodeType: stepType as "trigger" | "condition" | "query" | "transform" | "command" | "context" | "notice",
            status: "success",
            inputSummary,
            outputSummary,
            startedAt,
            finishedAt: Date.now(),
          })
        );

        commands.forEach((command) => {
          dispatchRuntimeCommand(dispatch, getState, command);
          context.runtimeState = getState().interactionRuntime;
        });

        currentStep = nextNodeId ? stepsById.get(nextNodeId) : undefined;
      }

      dispatch(finishRuleExecution({ executionId, status: "success" }));
    } catch (error) {
      dispatch(
        appendEngineDiagnostic({
          code: "runtime_rule_execute_failed",
          message: error instanceof Error ? error.message : "规则执行失败",
          ruleId: String(rule.ruleId),
          eventId: event.eventId,
        })
      );
      dispatch(finishRuleExecution({ executionId, status: "failed" }));
    }
  });

  dispatch(dequeueRuntimeEvent());
}
