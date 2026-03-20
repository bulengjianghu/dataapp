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
  applyComponentExtensionState,
  applyFieldDerivedState,
  initializeInteractionRuntime,
  setMainFieldValue,
  type BaseFieldState,
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

type RuntimeCommand = {
  commandType: string;
  targetFieldKey: string;
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
  return fieldKey.startsWith("main.") ? fieldKey.slice(5) : fieldKey;
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

function readFieldState(component: string, props: Record<string, unknown>): BaseFieldState {
  return {
    componentType: component,
    visible: props.hidden !== true,
    readonly: props.readonly === true,
    required: props.required === true,
    disabled: props.disabled === true,
    hint: typeof props.helpText === "string" ? props.helpText : undefined,
    winnerRuleIds: [],
    select:
      component === "select" || component === "radio" || component === "checkbox"
        ? {
            options: Array.isArray(props.options)
              ? props.options
                  .filter((item): item is { label?: unknown; value?: unknown } => typeof item === "object" && item !== null)
                  .map((item) => ({
                    label: typeof item.label === "string" ? item.label : String(item.value ?? ""),
                    value: String(item.value ?? ""),
                    raw: item as Record<string, unknown>,
                  }))
              : [],
          }
        : undefined,
    relation:
      component === "relation-select"
        ? {
            options: [],
            sourceFormId: typeof props.sourceFormId === "number" ? String(props.sourceFormId) : undefined,
            displayFields: Array.isArray(props.displayFields)
              ? props.displayFields.filter((item): item is string => typeof item === "string")
              : [],
          }
        : undefined,
  };
}

export function createInitialInteractionRuntimePayload(
  nodesById: NodesById,
  initialData: {
    mainData: Record<string, unknown>;
    detailTables: Record<string, Array<Record<string, unknown>>>;
  }
) {
  const fields: Record<string, BaseFieldState> = {};
  const detailTables: RootState["interactionRuntime"]["componentState"]["detailTables"] = {};

  Object.values(nodesById).forEach((node) => {
    if (node.type === "field" && typeof node.serverId === "string" && node.serverId) {
      const component = typeof node.props.component === "string" ? node.props.component : "input";
      fields[node.serverId] = readFieldState(component, node.props);
    }
    if (node.type === "detail_table" && typeof node.serverId === "string" && node.serverId) {
      const columns: Record<string, BaseFieldState> = {};
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
      detailTables: { ...(initialData.detailTables ?? {}) },
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
    detailTables: Record<string, Array<Record<string, unknown>>>;
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

export function createMainFieldChangeRuntimeEvent(fieldKey: string, value: unknown, source: RuntimeEvent["source"]): RuntimeEvent {
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

function executeContextStep(step: Record<string, unknown>, context: RuleExecutionContext) {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const saveAs = typeof data.saveAs === "string" ? data.saveAs : "";
  if (!saveAs) {
    return {
      nextNodeId: resolveNextTarget(step, "success"),
      outputSummary: "未配置 saveAs，已跳过",
    };
  }
  context.temp[saveAs] =
    resolveRuntimeValue(data.valueFrom ?? data.fieldKey ?? data.targetField, context) ?? data.literalValue;
  return {
    nextNodeId: resolveNextTarget(step, "success"),
    outputSummary: `写入临时变量 ${saveAs}`,
  };
}

function executeCommandStep(step: Record<string, unknown>, context: RuleExecutionContext): { nextNodeId?: string; commands: RuntimeCommand[]; outputSummary: string } {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const commandType = typeof data.commandType === "string" ? data.commandType : typeof data.command === "string" ? data.command : "";
  const targetFieldKey = normalizeFieldPath(
    typeof data.fieldKey === "string"
      ? data.fieldKey
      : typeof data.targetField === "string"
        ? data.targetField
        : ""
  );
  const value =
    data.valueFrom != null
      ? resolveRuntimeValue(data.valueFrom, context)
      : data.literalValue ?? data.value;

  if (!commandType || !targetFieldKey) {
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
        targetFieldKey,
        value,
        emitEventAfterCommand: data.emitEventAfterCommand === true,
      },
    ],
    outputSummary: `${commandType} -> ${targetFieldKey}`,
  };
}

function dispatchRuntimeCommand(
  dispatch: AppDispatch,
  command: RuntimeCommand,
  state: RootState
) {
  switch (command.commandType) {
    case "setVisible":
      dispatch(
        applyFieldDerivedState({
          fieldKey: command.targetFieldKey,
          patch: { visible: normalizeBooleanValue(command.value) },
        })
      );
      break;
    case "setReadonly":
      dispatch(
        applyFieldDerivedState({
          fieldKey: command.targetFieldKey,
          patch: { readonly: normalizeBooleanValue(command.value) },
        })
      );
      break;
    case "setRequired":
      dispatch(
        applyFieldDerivedState({
          fieldKey: command.targetFieldKey,
          patch: { required: normalizeBooleanValue(command.value) },
        })
      );
      break;
    case "setOptions":
      if (Array.isArray(command.value)) {
        const currentField = state.interactionRuntime.componentState.fields[command.targetFieldKey];
        if (currentField?.componentType === "relation-select") {
          dispatch(
            applyComponentExtensionState({
              fieldKey: command.targetFieldKey,
              patch: {
                relation: {
                  ...(currentField.relation ?? { options: [] }),
                  options: command.value as RuntimeOption[],
                },
              },
            })
          );
        } else {
          dispatch(
            applyComponentExtensionState({
              fieldKey: command.targetFieldKey,
              patch: {
                select: {
                  options: command.value as RuntimeOption[],
                },
              },
            })
          );
        }
      }
      break;
    case "clearValue":
      dispatch(setMainFieldValue({ fieldKey: command.targetFieldKey, value: undefined }));
      break;
    case "setValue":
    default:
      dispatch(setMainFieldValue({ fieldKey: command.targetFieldKey, value: command.value }));
      break;
  }

  if (command.emitEventAfterCommand) {
    const nextValue =
      command.commandType === "clearValue"
        ? undefined
        : state.interactionRuntime.data.mainData[command.targetFieldKey] ?? command.value;
    dispatch(enqueueRuntimeEvent(createMainFieldChangeRuntimeEvent(command.targetFieldKey, nextValue, "rule")));
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
          const result = executeContextStep(currentStep, context);
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
            nodeType: stepType as "condition" | "command" | "notice" | "query" | "transform" | "trigger" | "end" | "context",
            status: "success",
            inputSummary,
            outputSummary,
            startedAt,
            finishedAt: Date.now(),
          })
        );

        commands.forEach((command) => dispatchRuntimeCommand(dispatch, command, getState()));

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
