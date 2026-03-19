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

export type InteractionRuleDraftState = {
  meta: InteractionRuleMeta;
  graphJson: Record<string, unknown>;
  compiledJson: Record<string, unknown>;
  saveStatus: "idle" | "saving" | "success" | "error";
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
  saveStatus: "idle",
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
      }>
    ) => {
      state.meta = action.payload.meta;
      state.graphJson = action.payload.graphJson ?? {};
      state.compiledJson = action.payload.compiledJson ?? {};
      state.saveStatus = "idle";
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
    setInteractionRuleSaveStatus: (
      state,
      action: PayloadAction<{
        status: InteractionRuleDraftState["saveStatus"];
        errorMessage?: string | null;
      }>
    ) => {
      state.saveStatus = action.payload.status;
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
  setInteractionRuleSaveStatus,
} = interactionRuleDraftSlice.actions;

export const interactionRuleDraftReducer = interactionRuleDraftSlice.reducer;
