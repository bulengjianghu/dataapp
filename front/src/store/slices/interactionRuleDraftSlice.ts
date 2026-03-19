import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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

export type CompiledInteractionRule = {
  ruleId: string;
  eventType: InteractionEventType;
  triggerScope: "MAIN_FIELD" | "DETAIL_ROW" | "RECORD" | "GLOBAL";
  triggerTarget?: string;
  priority: number;
  steps: Array<Record<string, unknown>>;
  failurePolicy: "interrupt" | "continue" | "fallback";
  references: RuleReferenceSummary;
};

export type InteractionRuleDraftState = {
  meta: InteractionRuleMeta;
  graphJson: Record<string, unknown>;
  compiledJson: Record<string, unknown>;
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
  compiledJson: {},
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
        compiledJson?: Record<string, unknown>;
        compiledRule?: CompiledInteractionRule | null;
      }>
    ) => {
      state.meta = action.payload.meta;
      state.graphJson = action.payload.graphJson ?? {};
      state.compiledJson = action.payload.compiledJson ?? {};
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
    updateInteractionRuleCompiledJson: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.compiledJson = action.payload;
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
  updateInteractionRuleCompiledJson,
  setInteractionRuleCompiledRule,
  setInteractionRuleSaveStatus,
  setInteractionRulePublishStatus,
} = interactionRuleDraftSlice.actions;

export const interactionRuleDraftReducer = interactionRuleDraftSlice.reducer;
