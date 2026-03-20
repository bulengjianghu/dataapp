import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RuleNodeType } from "./interactionRuleGraphSlice";

export type RuntimeEvent = {
  eventId: string;
  eventType:
    | "FIELD_CHANGE_MAIN"
    | "FIELD_CHANGE_DETAIL"
    | "DETAIL_ROW_ADDED"
    | "DETAIL_ROW_REMOVED"
    | "RELATION_OPEN"
    | "RELATION_SELECTED"
    | "FORM_INIT"
    | "FORM_SUBMIT_BEFORE";
  target?: string;
  scope?: "MAIN_FIELD" | "DETAIL_ROW" | "RECORD";
  payload: Record<string, unknown>;
  source: "user" | "rule" | "system";
  createdAt: number;
};

export type ExecutionTrace = {
  executionId: string;
  ruleId: string;
  nodeId: string;
  nodeType: RuleNodeType;
  status: "running" | "success" | "failed" | "skipped";
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
  startedAt: number;
  finishedAt?: number;
};

export type InteractionEngineState = {
  pendingEvents: RuntimeEvent[];
  runningExecutions: Record<
    string,
    {
      ruleId: string;
      eventId: string;
      startedAt: number;
      status: "running" | "success" | "failed";
    }
  >;
  traces: ExecutionTrace[];
  diagnostics: Array<{
    code: string;
    message: string;
    ruleId?: string;
    eventId?: string;
  }>;
};

const initialState: InteractionEngineState = {
  pendingEvents: [],
  runningExecutions: {},
  traces: [],
  diagnostics: [],
};

const interactionEngineSlice = createSlice({
  name: "interactionEngine",
  initialState,
  reducers: {
    resetInteractionEngineState: () => initialState,
    enqueueRuntimeEvent: (state, action: PayloadAction<RuntimeEvent>) => {
      state.pendingEvents.push(action.payload);
    },
    dequeueRuntimeEvent: (state) => {
      state.pendingEvents.shift();
    },
    startRuleExecution: (
      state,
      action: PayloadAction<{ executionId: string; ruleId: string; eventId: string; startedAt: number }>
    ) => {
      state.runningExecutions[action.payload.executionId] = {
        ruleId: action.payload.ruleId,
        eventId: action.payload.eventId,
        startedAt: action.payload.startedAt,
        status: "running",
      };
    },
    finishRuleExecution: (
      state,
      action: PayloadAction<{ executionId: string; status: "success" | "failed" }>
    ) => {
      const current = state.runningExecutions[action.payload.executionId];
      if (!current) {
        return;
      }
      state.runningExecutions[action.payload.executionId] = {
        ...current,
        status: action.payload.status,
      };
    },
    appendExecutionTrace: (state, action: PayloadAction<ExecutionTrace>) => {
      state.traces.push(action.payload);
      if (state.traces.length > 200) {
        state.traces = state.traces.slice(-200);
      }
    },
    appendEngineDiagnostic: (
      state,
      action: PayloadAction<{ code: string; message: string; ruleId?: string; eventId?: string }>
    ) => {
      state.diagnostics.push(action.payload);
      if (state.diagnostics.length > 100) {
        state.diagnostics = state.diagnostics.slice(-100);
      }
    },
    clearRuntimeTraces: (state) => {
      state.traces = [];
      state.diagnostics = [];
      state.runningExecutions = {};
    },
  },
});

export const {
  resetInteractionEngineState,
  enqueueRuntimeEvent,
  dequeueRuntimeEvent,
  startRuleExecution,
  finishRuleExecution,
  appendExecutionTrace,
  appendEngineDiagnostic,
  clearRuntimeTraces,
} = interactionEngineSlice.actions;

export const interactionEngineReducer = interactionEngineSlice.reducer;
