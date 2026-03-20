import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RuleNodeType } from "./interactionRuleGraphSlice";

export type InteractionEventType =
  | "FIELD_CHANGE_MAIN"
  | "FIELD_CHANGE_DETAIL"
  | "DETAIL_ROW_ADDED"
  | "DETAIL_ROW_REMOVED"
  | "RELATION_OPEN"
  | "RELATION_SELECTED"
  | "FORM_INIT"
  | "FORM_SUBMIT_BEFORE";

export type InteractionRuleMeta = {
  formId: string | null;
  ruleId: string | null;
  ruleCode: string;
  ruleName: string;
  eventType: InteractionEventType;
  scopeType: "FORM" | "FORM_VERSION";
  priority: number;
  description: string;
  enabled: boolean;
  compilerVersion: string;
  status: string;
  draftVersion: number;
};

export type RuleReferenceSummary = {
  fields: string[];
  detailTables: string[];
  forms: string[];
  events: string[];
};

export type CompiledInteractionStep = {
  id: string;
  type: Exclude<RuleNodeType, "trigger">;
  order: number;
  data: Record<string, unknown>;
  next?: Array<{
    target: string;
    branch?: "success" | "failure" | "true" | "false" | "empty" | "nonEmpty";
  }>;
};

export type CompiledInteractionRule = {
  ruleId: string;
  eventType: InteractionEventType;
  triggerScope: "MAIN_FIELD" | "DETAIL_ROW" | "RECORD" | "GLOBAL";
  triggerTarget?: string;
  priority: number;
  steps: CompiledInteractionStep[];
  failurePolicy: "interrupt" | "continue" | "fallback";
  references: RuleReferenceSummary;
};

export function serializeCompiledInteractionRule(
  compiledRule: CompiledInteractionRule | null
): Record<string, unknown> {
  if (!compiledRule) {
    return {};
  }

  return {
    eventType: compiledRule.eventType,
    triggerScope: compiledRule.triggerScope,
    triggerTarget: compiledRule.triggerTarget,
    priority: compiledRule.priority,
    steps: compiledRule.steps,
    failurePolicy: compiledRule.failurePolicy,
    references: compiledRule.references,
  };
}

export function deserializeCompiledInteractionRule(
  ruleId: string,
  compiledJson: Record<string, unknown> | undefined
): CompiledInteractionRule | null {
  if (!compiledJson || Object.keys(compiledJson).length === 0) {
    return null;
  }

  const eventType = compiledJson.eventType;
  const triggerScope = compiledJson.triggerScope;
  const priority = compiledJson.priority;
  const steps = compiledJson.steps;
  const failurePolicy = compiledJson.failurePolicy;
  const references = compiledJson.references;

  if (
    eventType !== "FIELD_CHANGE_MAIN" &&
    eventType !== "FIELD_CHANGE_DETAIL" &&
    eventType !== "DETAIL_ROW_ADDED" &&
    eventType !== "DETAIL_ROW_REMOVED" &&
    eventType !== "RELATION_OPEN" &&
    eventType !== "RELATION_SELECTED" &&
    eventType !== "FORM_INIT" &&
    eventType !== "FORM_SUBMIT_BEFORE"
  ) {
    return null;
  }

  if (
    triggerScope !== "MAIN_FIELD" &&
    triggerScope !== "DETAIL_ROW" &&
    triggerScope !== "RECORD" &&
    triggerScope !== "GLOBAL"
  ) {
    return null;
  }

  if (typeof priority !== "number" || !Array.isArray(steps)) {
    return null;
  }

  if (
    failurePolicy !== "interrupt" &&
    failurePolicy !== "continue" &&
    failurePolicy !== "fallback"
  ) {
    return null;
  }

  const referencePayload =
    references && typeof references === "object"
      ? (references as Partial<RuleReferenceSummary>)
      : undefined;

  return {
    ruleId,
    eventType,
    triggerScope,
    triggerTarget: typeof compiledJson.triggerTarget === "string" ? compiledJson.triggerTarget : undefined,
    priority,
    steps: steps as CompiledInteractionStep[],
    failurePolicy,
    references: {
      fields: Array.isArray(referencePayload?.fields) ? referencePayload.fields : [],
      detailTables: Array.isArray(referencePayload?.detailTables) ? referencePayload.detailTables : [],
      forms: Array.isArray(referencePayload?.forms) ? referencePayload.forms : [],
      events: Array.isArray(referencePayload?.events) ? referencePayload.events : [],
    },
  };
}

export type InteractionRuleDraftState = {
  meta: InteractionRuleMeta;
  graphJson: Record<string, unknown>;
  compiledRule: CompiledInteractionRule | null;
  saveStatus: "idle" | "saving" | "success" | "error";
  publishStatus: "idle" | "publishing" | "success" | "error";
  lastSavedAt: string | null;
  errorMessage: string | null;
  initialized: boolean;
};

export const DEFAULT_INTERACTION_RULE_META: InteractionRuleMeta = {
  formId: null,
  ruleId: null,
  ruleCode: "",
  ruleName: "",
  eventType: "FIELD_CHANGE_MAIN",
  scopeType: "FORM",
  priority: 100,
  description: "",
  enabled: true,
  compilerVersion: "",
  status: "DRAFT",
  draftVersion: 0,
};

const initialState: InteractionRuleDraftState = {
  meta: DEFAULT_INTERACTION_RULE_META,
  graphJson: {},
  compiledRule: null,
  saveStatus: "idle",
  publishStatus: "idle",
  lastSavedAt: null,
  errorMessage: null,
  initialized: false,
};

const interactionRuleDraftSlice = createSlice({
  name: "interactionRuleDraft",
  initialState,
  reducers: {
    resetInteractionRuleDraftState: () => initialState,
    initializeInteractionRuleDraftState: (
      state,
      action: PayloadAction<{
        meta: InteractionRuleMeta;
        graphJson?: Record<string, unknown>;
        compiledRule?: CompiledInteractionRule | null;
      }>
    ) => {
      state.meta = action.payload.meta;
      state.graphJson = action.payload.graphJson ?? {};
      state.compiledRule = action.payload.compiledRule ?? null;
      state.saveStatus = "idle";
      state.publishStatus = "idle";
      state.lastSavedAt = null;
      state.errorMessage = null;
      state.initialized = true;
    },
    updateInteractionRuleMeta: (
      state,
      action: PayloadAction<{
        key: keyof InteractionRuleMeta;
        value: InteractionRuleMeta[keyof InteractionRuleMeta];
      }>
    ) => {
      state.meta = {
        ...state.meta,
        [action.payload.key]: action.payload.value,
      };
    },
    updateInteractionRuleGraphJson: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.graphJson = action.payload;
    },
    setInteractionRuleCompiledRule: (state, action: PayloadAction<CompiledInteractionRule | null>) => {
      state.compiledRule = action.payload;
    },
    setInteractionRuleSaveStatus: (
      state,
      action: PayloadAction<{
        status: InteractionRuleDraftState["saveStatus"];
        errorMessage?: string | null;
        lastSavedAt?: string | null;
      }>
    ) => {
      state.saveStatus = action.payload.status;
      state.lastSavedAt = action.payload.lastSavedAt ?? state.lastSavedAt;
      state.errorMessage = action.payload.errorMessage ?? null;
    },
    setInteractionRulePublishStatus: (
      state,
      action: PayloadAction<{
        status: InteractionRuleDraftState["publishStatus"];
        errorMessage?: string | null;
      }>
    ) => {
      state.publishStatus = action.payload.status;
      state.errorMessage = action.payload.errorMessage ?? null;
    },
  },
});

export const {
  resetInteractionRuleDraftState,
  initializeInteractionRuleDraftState,
  updateInteractionRuleMeta,
  updateInteractionRuleGraphJson,
  setInteractionRuleCompiledRule,
  setInteractionRuleSaveStatus,
  setInteractionRulePublishStatus,
} = interactionRuleDraftSlice.actions;

export const interactionRuleDraftReducer = interactionRuleDraftSlice.reducer;
