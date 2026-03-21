import { request } from "../../../services/api";
import type { NodesById } from "../../../types/schema/node";
import type { AppDispatch, RootState } from "../../../store";
import { searchRelationRecords, type RelationRecord } from "./recordRuntime";
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
  replaceDetailRows,
  setDetailFieldValue,
  setMainFieldValue,
  setQueryCache,
  updateDetailRow,
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
  targetType: "main_field" | "detail_field" | "detail_row" | "detail_column" | "detail_table";
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

function getFieldRuntimeState(fieldPath: unknown, context: RuleExecutionContext) {
  if (typeof fieldPath !== "string" || !fieldPath) {
    return undefined;
  }
  const normalizedPath = normalizeFieldPath(fieldPath);
  const isDetailField = fieldPath.startsWith("detail.");
  if (isDetailField) {
    const detailTableKey = typeof context.event.payload.detailTableKey === "string" ? context.event.payload.detailTableKey : "";
    if (!detailTableKey) {
      return undefined;
    }
    return context.runtimeState.componentState.detailTables[detailTableKey]?.columns[normalizedPath];
  }
  return context.runtimeState.componentState.fields[normalizedPath];
}

function buildComparableCandidates(value: unknown, fieldState: RuntimeFieldState | undefined) {
  const candidates = new Set<unknown>([value]);
  if (value == null || typeof value === "object") {
    return candidates;
  }

  const normalizedValue = String(value);
  let options: RuntimeOption[] = [];
  if (fieldState && "select" in fieldState && fieldState.select?.options) {
    options = fieldState.select.options;
  } else if (isRelationFieldState(fieldState)) {
    options = fieldState.relation.options;
  }

  options.forEach((option) => {
    if (option.value === normalizedValue) {
      candidates.add(option.label);
    }
    if (option.label === normalizedValue) {
      candidates.add(option.value);
    }
  });

  return candidates;
}

function isEqualWithFieldOptions(leftValue: unknown, rightValue: unknown, fieldState: RuntimeFieldState | undefined) {
  const leftCandidates = buildComparableCandidates(leftValue, fieldState);
  const rightCandidates = buildComparableCandidates(rightValue, fieldState);
  for (const candidate of leftCandidates) {
    if (rightCandidates.has(candidate)) {
      return true;
    }
  }
  return false;
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

function buildQueryCacheKey(data: Record<string, unknown>, context: RuleExecutionContext) {
  return JSON.stringify({
    sourceType: data.sourceType,
    sourceFormId: data.sourceFormId,
    fieldSelection: data.fieldSelection,
    filters: data.filters,
    keyword: data.keyword ?? context.event.payload.keyword,
    displayFields: data.displayFields,
  });
}

function mapRelationRecordToOption(record: RelationRecord, displayFields: string[]): RuntimeOption {
  const label =
    displayFields.length > 0
      ? displayFields
          .map((fieldKey) => String(record.mainData[fieldKey] ?? ""))
          .filter(Boolean)
          .join(" / ")
      : String(record.id);
  return {
    label: label || String(record.id),
    value: String(record.id),
    raw: {
      id: record.id,
      mainData: record.mainData,
      detailTables: record.detailTables,
      status: record.status,
      formId: record.formId,
      formVersionId: record.formVersionId,
    },
  };
}

async function executeQueryStep(
  step: Record<string, unknown>,
  context: RuleExecutionContext,
  getState: () => RootState,
  dispatch: AppDispatch
) {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const sourceType =
    typeof data.sourceType === "string" && data.sourceType.trim()
      ? data.sourceType
      : "relation_records";
  const saveAs = typeof data.saveAs === "string" ? data.saveAs : "";
  if (!saveAs) {
    return {
      nextNodeId: resolveNextTarget(step),
      outputSummary: "query 未配置 saveAs，已跳过",
    };
  }

  if (sourceType === "relation_records") {
    const sourceFormId = Number(resolveRuntimeValue(data.sourceFormId ?? data.formId, context) ?? data.sourceFormId);
    if (!sourceFormId) {
      return {
        nextNodeId: undefined,
        outputSummary: "query 缺少 sourceFormId",
      };
    }
    const cacheKey = buildQueryCacheKey(data, context);
    const cached = getState().interactionRuntime.queryCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) {
      writeTempValue(context, saveAs, cached.data);
      return {
        nextNodeId: resolveNextTarget(step),
        outputSummary: `命中缓存 ${saveAs}`,
      };
    }

    const displayFields = Array.isArray(data.displayFields)
      ? data.displayFields.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const filters = Array.isArray(data.filters)
      ? data.filters
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => ({
            ...item,
            value:
              typeof item.valueFrom === "string"
                ? resolveRuntimeValue(item.valueFrom, context)
                : item.value,
          }))
      : [];
    const keyword = String(resolveRuntimeValue(data.keywordFrom, context) ?? data.keyword ?? context.event.payload.keyword ?? "");
    const result = await searchRelationRecords({
      sourceFormId,
      keyword,
      displayFields,
      filters,
    });
    writeTempValue(context, saveAs, result.records);
    dispatch(setQueryCache({ key: cacheKey, data: result.records, expiresAt: Date.now() + 60_000 }));
    return {
      nextNodeId: resolveNextTarget(step),
      outputSummary: `查询返回 ${result.records.length} 条记录`,
    };
  }

  if (sourceType === "detail_rows") {
    const detailTableKey =
      typeof data.detailTableKey === "string"
        ? data.detailTableKey
        : typeof context.event.payload.detailTableKey === "string"
          ? context.event.payload.detailTableKey
          : "";
    const rows = detailTableKey ? context.runtimeState.data.detailTables[detailTableKey] ?? [] : [];
    writeTempValue(context, saveAs, rows);
    return {
      nextNodeId: resolveNextTarget(step),
      outputSummary: `读取明细 ${detailTableKey || "-"} ${rows.length} 行`,
    };
  }

  const fallbackValue = resolveRuntimeValue(data.valueFrom ?? data.fieldKey ?? data.targetField, context) ?? data.literalValue;
  writeTempValue(context, saveAs, fallbackValue);
  return {
    nextNodeId: resolveNextTarget(step),
    outputSummary: `写入临时变量 ${saveAs}`,
  };
}

function executeTransformStep(step: Record<string, unknown>, context: RuleExecutionContext) {
  const data = typeof step.data === "object" && step.data ? (step.data as Record<string, unknown>) : {};
  const saveAs = typeof data.output === "string" && data.output.trim() ? data.output : typeof data.saveAs === "string" ? data.saveAs : "";
  if (!saveAs) {
    return {
      nextNodeId: resolveNextTarget(step),
      outputSummary: "transform 未配置 output/saveAs，已跳过",
    };
  }

  const transformType = typeof data.transformType === "string" ? data.transformType : "expression";
  const inputValue = data.input != null ? resolveRuntimeValue(data.input, context) : resolveRuntimeValue(data.valueFrom ?? data.fieldKey, context);
  let output: unknown = inputValue;

  if (transformType === "option_mapping") {
    const displayFields = Array.isArray(data.displayFields)
      ? data.displayFields.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    output = Array.isArray(inputValue)
      ? inputValue.map((item, index) => {
          if (typeof item === "object" && item !== null && "mainData" in item) {
            return mapRelationRecordToOption(item as RelationRecord, displayFields);
          }
          if (typeof item === "object" && item !== null) {
            const raw = item as Record<string, unknown>;
            return {
              label: String(raw.label ?? raw.name ?? raw.id ?? `选项${index + 1}`),
              value: String(raw.value ?? raw.id ?? index),
              raw,
            } satisfies RuntimeOption;
          }
          return {
            label: String(item ?? `选项${index + 1}`),
            value: String(item ?? index),
          } satisfies RuntimeOption;
        })
      : [];
  } else if (transformType === "aggregate") {
    const rows = Array.isArray(inputValue) ? inputValue : [];
    const aggregateField = typeof data.aggregateField === "string" ? data.aggregateField : typeof data.fieldKey === "string" ? data.fieldKey : "";
    const aggregateFn = typeof data.aggregateFn === "string" ? data.aggregateFn : "sum";
    const values = rows.map((row) => {
      if (typeof row === "object" && row !== null && "values" in row) {
        return (row as DetailRowRuntime).values[aggregateField];
      }
      if (typeof row === "object" && row !== null) {
        return (row as Record<string, unknown>)[aggregateField];
      }
      return row;
    });
    if (aggregateFn === "count") {
      output = values.length;
    } else if (aggregateFn === "max") {
      output = values.reduce<number>((current, item) => Math.max(current, Number(item ?? 0)), Number.NEGATIVE_INFINITY);
    } else if (aggregateFn === "min") {
      output = values.reduce<number>((current, item) => Math.min(current, Number(item ?? 0)), Number.POSITIVE_INFINITY);
    } else {
      output = values.reduce<number>((current, item) => current + Number(item ?? 0), 0);
    }
  } else if (transformType === "field_mapping") {
    const mappings = Array.isArray(data.mappings)
      ? data.mappings.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      : [];
    const sourceRows = Array.isArray(inputValue) ? inputValue : [];
    output = sourceRows.map((row) =>
      mappings.reduce<Record<string, unknown>>((result, mapping) => {
        const sourceField = typeof mapping.sourceField === "string" ? mapping.sourceField : typeof mapping.targetFieldKey === "string" ? mapping.targetFieldKey : "";
        const targetField = typeof mapping.targetField === "string" ? mapping.targetField : typeof mapping.currentFieldKey === "string" ? mapping.currentFieldKey : "";
        if (!sourceField || !targetField) {
          return result;
        }
        const rawRow =
          typeof row === "object" && row !== null && "values" in row
            ? (row as DetailRowRuntime).values
            : (row as Record<string, unknown>);
        const relationMainData =
          typeof row === "object" && row !== null && "mainData" in row
            ? (row as RelationRecord).mainData
            : undefined;
        result[targetField] = relationMainData?.[sourceField] ?? rawRow?.[sourceField];
        return result;
      }, {})
    );
  } else if (transformType === "filter") {
    const rows = Array.isArray(inputValue) ? inputValue : [];
    const fieldKey = typeof data.fieldKey === "string" ? data.fieldKey : "";
    const expectedValue = data.valueFrom != null ? resolveRuntimeValue(data.valueFrom, context) : data.literalValue;
    output = rows.filter((row) => {
      const rawRow = typeof row === "object" && row !== null && "values" in row ? (row as DetailRowRuntime).values : (row as Record<string, unknown>);
      return rawRow?.[fieldKey] === expectedValue;
    });
  } else if (transformType === "sort") {
    const rows = Array.isArray(inputValue) ? [...inputValue] : [];
    const fieldKey = typeof data.fieldKey === "string" ? data.fieldKey : "";
    const direction = data.direction === "desc" ? -1 : 1;
    rows.sort((left, right) => {
      const leftRow = typeof left === "object" && left !== null && "values" in left ? (left as DetailRowRuntime).values : (left as Record<string, unknown>);
      const rightRow = typeof right === "object" && right !== null && "values" in right ? (right as DetailRowRuntime).values : (right as Record<string, unknown>);
      return String(leftRow?.[fieldKey] ?? "").localeCompare(String(rightRow?.[fieldKey] ?? "")) * direction;
    });
    output = rows;
  } else if (transformType === "expression") {
    output = inputValue ?? data.literalValue;
  }

  writeTempValue(context, saveAs, output);
  return {
    nextNodeId: resolveNextTarget(step),
    outputSummary: `输出变量 ${saveAs}`,
  };
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

function resolveNextTarget(step: Record<string, unknown>) {
  const next = Array.isArray(step.next) ? step.next : [];
  const matched = next.find(
    (item): item is { target?: unknown; flowType?: unknown } =>
      typeof item === "object" &&
      item !== null &&
      (((item as { flowType?: unknown }).flowType ?? "direct") === "direct")
  );
  if (typeof matched?.target === "string" && matched.target) {
    return matched.target;
  }
  return undefined;
}

function evaluateComparison(
  fieldPath: unknown,
  operator: string,
  rightValue: unknown,
  context: RuleExecutionContext
) {
  const leftValue = resolveRuntimeValue(fieldPath, context);
  const fieldState = getFieldRuntimeState(fieldPath, context);

  switch (operator) {
    case "isEmpty":
      return leftValue === undefined || leftValue === null || leftValue === "";
    case "ne":
      return !isEqualWithFieldOptions(leftValue, rightValue, fieldState);
    case "contains":
      return Array.isArray(leftValue)
        ? leftValue.includes(rightValue)
        : String(leftValue ?? "").includes(String(rightValue ?? ""));
    case "gt":
      return Number(leftValue ?? 0) > Number(rightValue ?? 0);
    case "gte":
      return Number(leftValue ?? 0) >= Number(rightValue ?? 0);
    case "lt":
      return Number(leftValue ?? 0) < Number(rightValue ?? 0);
    case "lte":
      return Number(leftValue ?? 0) <= Number(rightValue ?? 0);
    case "eq":
    default:
      return isEqualWithFieldOptions(leftValue, rightValue, fieldState);
  }
}

function evaluateBranchEdge(
  edge: Record<string, unknown>,
  context: RuleExecutionContext
) {
  const flowType = edge.flowType === "condition" ? "condition" : "direct";
  if (flowType === "direct") {
    return true;
  }
  const conditions = Array.isArray(edge.conditions)
    ? edge.conditions.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
  if (conditions.length === 0) {
    return false;
  }
  const logic = edge.conditionLogic === "or" ? "or" : "and";
  const results = conditions.map((condition) =>
    evaluateComparison(
      condition.leftOperand ?? condition.fieldKey,
      typeof condition.operator === "string" ? condition.operator : "eq",
      condition.rightOperand ?? condition.expectedValue ?? condition.literalValue ?? condition.value,
      context
    )
  );
  return logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

function executeBranchStep(step: Record<string, unknown>, context: RuleExecutionContext) {
  const next = Array.isArray(step.next) ? step.next : [];
  const nextNodeIds = next
    .filter((edge): edge is Record<string, unknown> => typeof edge === "object" && edge !== null)
    .filter((edge) => evaluateBranchEdge(edge, context))
    .map((edge) => edge.target)
    .filter((target): target is string => typeof target === "string" && target.length > 0);

  return {
    nextNodeIds,
    outputSummary: nextNodeIds.length > 0 ? `命中 ${nextNodeIds.length} 条分流边` : "未命中任何分流边",
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
      nextNodeId: resolveNextTarget(step),
      outputSummary: `${stepLabel} 未配置 saveAs，已跳过`,
    };
  }

  writeTempValue(context, saveAs, resolvedValue);
  return {
    nextNodeId: resolveNextTarget(step),
    outputSummary: `写入临时变量 ${saveAs}`,
  };
}

function resolveCommandTarget(
  data: Record<string, unknown>,
  context: RuleExecutionContext
): RuntimeCommandTarget | null {
  const rawFieldPath =
    typeof data.fieldKey === "string"
      ? data.fieldKey
      : typeof data.targetField === "string"
        ? data.targetField
        : "";
  const fieldKey = normalizeFieldPath(rawFieldPath);
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
  if (targetType === "detail_row" && detailTableKey && rowId) {
    return { targetType: "detail_row", detailTableKey, rowId };
  }
  if (targetType === "detail_column" && detailTableKey && fieldKey) {
    return { targetType: "detail_column", detailTableKey, fieldKey };
  }
  const targetsDetailField =
    targetType === "detail_field" || rawFieldPath.startsWith("detail.");
  if (targetsDetailField && detailTableKey && rowId && fieldKey) {
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
      nextNodeId: undefined,
      commands: [],
      outputSummary: "命令缺少目标字段或命令类型",
    };
  }

  return {
    nextNodeId: resolveNextTarget(step),
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

function resolveTargetFieldState(state: RootState["interactionRuntime"], target: RuntimeCommandTarget) {
  if (target.targetType === "detail_field" && target.detailTableKey && target.fieldKey) {
    return state.componentState.detailTables[target.detailTableKey]?.columns[target.fieldKey];
  }
  if (target.fieldKey) {
    return state.componentState.fields[target.fieldKey];
  }
  return undefined;
}

function normalizeValueByFieldState(value: unknown, fieldState: RuntimeFieldState | undefined) {
  if (!fieldState) {
    return value;
  }
  if (fieldState.componentType === "number") {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }
  return value;
}

function dispatchRuntimeCommand(
  dispatch: AppDispatch,
  getState: () => RootState,
  command: RuntimeCommand
) {
  const { target } = command;
  const state = getState();
  const normalizedFieldValue = normalizeValueByFieldState(command.value, resolveTargetFieldState(state.interactionRuntime, target));

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
      if (target.detailTableKey && command.value && typeof command.value === "object") {
        const sourceRows = Array.isArray(command.value)
          ? command.value.filter(
              (item): item is Record<string, unknown> =>
                typeof item === "object" && item !== null && !Array.isArray(item)
            )
          : [command.value as Record<string, unknown>];
        if (sourceRows.length === 0) {
          break;
        }
        const appendedRows = sourceRows.map((item) =>
          createDetailRowRuntime(item, { __origin: "relation_fill" })
        );
        dispatch(
          appendDetailRows({
            detailTableKey: target.detailTableKey,
            rows: appendedRows,
          })
        );
        if (command.emitEventAfterCommand) {
          appendedRows.forEach((row) => {
            dispatch(
              enqueueRuntimeEvent(
                createDetailRowAddedRuntimeEvent(target.detailTableKey!, row.__rowId, "rule")
              )
            );
          });
        }
      }
      break;
    case "updateRow":
      if (
        target.detailTableKey &&
        target.rowId &&
        command.value &&
        typeof command.value === "object" &&
        !Array.isArray(command.value)
      ) {
        dispatch(
          updateDetailRow({
            detailTableKey: target.detailTableKey,
            rowId: target.rowId,
            patch: command.value as Record<string, unknown>,
          })
        );
      }
      break;
    case "replaceTable":
      if (target.detailTableKey && Array.isArray(command.value)) {
        dispatch(
          replaceDetailRows({
            detailTableKey: target.detailTableKey,
            rows: command.value as Array<Record<string, unknown> | DetailRowRuntime>,
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
        dispatch(
          setDetailFieldValue({
            detailTableKey: target.detailTableKey,
            rowId: target.rowId,
            fieldKey: target.fieldKey,
            value: normalizedFieldValue,
          })
        );
      } else if (target.fieldKey) {
        dispatch(setMainFieldValue({ fieldKey: target.fieldKey, value: normalizedFieldValue }));
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
        createMainFieldChangeRuntimeEvent(target.fieldKey, nextState.data.mainData[target.fieldKey] ?? normalizedFieldValue, "rule")
      )
    );
  }
}

export async function processNextRuntimeEvent(params: {
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
  for (const rule of matchedRules) {
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

      const startSteps = steps.filter((step) => {
        const stepId = typeof step.id === "string" ? step.id : "";
        return !steps.some((candidate) =>
          Array.isArray(candidate.next) &&
          candidate.next.some(
            (edge) =>
              typeof edge === "object" &&
              edge !== null &&
              typeof (edge as { target?: unknown }).target === "string" &&
              (edge as { target?: string }).target === stepId
          )
        );
      });
      const executionQueue = [...(startSteps.length > 0 ? startSteps : steps.slice(0, 1))];
      const executedNodes = new Set<string>();

      while (executionQueue.length > 0) {
        const currentStep = executionQueue.shift();
        if (!currentStep) {
          continue;
        }
        context.runtimeState = getState().interactionRuntime;
        const stepId = typeof currentStep.id === "string" ? currentStep.id : "";
        if (stepId && executedNodes.has(stepId)) {
          continue;
        }
        if (stepId) {
          executedNodes.add(stepId);
        }
        const stepType = typeof currentStep.type === "string" ? currentStep.type : "notice";
        const inputSummary =
          typeof currentStep.data === "object" && currentStep.data
            ? JSON.stringify(currentStep.data)
            : undefined;

        let nextNodeIds: string[] = [];
        let outputSummary = "已执行";
        let commands: RuntimeCommand[] = [];

        if (stepType === "branch") {
          const result = executeBranchStep(currentStep, context);
          nextNodeIds = result.nextNodeIds;
          outputSummary = result.outputSummary;
        } else if (stepType === "context") {
          const result = executeContextLikeStep(currentStep, context, "context");
          nextNodeIds = result.nextNodeId ? [result.nextNodeId] : [];
          outputSummary = result.outputSummary;
        } else if (stepType === "query") {
          const result = await executeQueryStep(currentStep, context, getState, dispatch);
          nextNodeIds = result.nextNodeId ? [result.nextNodeId] : [];
          outputSummary = result.outputSummary;
        } else if (stepType === "transform") {
          const result = executeTransformStep(currentStep, context);
          nextNodeIds = result.nextNodeId ? [result.nextNodeId] : [];
          outputSummary = result.outputSummary;
        } else if (stepType === "command") {
          const result = executeCommandStep(currentStep, context);
          nextNodeIds = result.nextNodeId ? [result.nextNodeId] : [];
          outputSummary = result.outputSummary;
          commands = result.commands;
        } else {
          const nextNodeId = resolveNextTarget(currentStep);
          nextNodeIds = nextNodeId ? [nextNodeId] : [];
        }

        dispatch(
          appendExecutionTrace({
            executionId,
            ruleId: String(rule.ruleId),
            nodeId: stepId,
            nodeType: stepType as import("../../../store/slices/interactionRuleGraphSlice").RuleNodeType,
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

        nextNodeIds
          .map((nextNodeId) => stepsById.get(nextNodeId))
          .filter((step): step is Record<string, unknown> => Boolean(step))
          .forEach((step) => {
            executionQueue.push(step);
          });
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
  }

  dispatch(dequeueRuntimeEvent());
}
