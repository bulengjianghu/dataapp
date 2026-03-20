import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type RuntimeOption = {
  label: string;
  value: string;
  raw?: Record<string, unknown>;
};

export type BaseFieldState = {
  visible: boolean;
  readonly: boolean;
  required: boolean;
  disabled: boolean;
  hint?: string;
  loading?: boolean;
  winnerRuleIds: string[];
  componentType: string;
  select?: {
    options: RuntimeOption[];
  };
  relation?: {
    options: RuntimeOption[];
    filter?: Record<string, unknown>;
    sourceFormId?: string;
    displayFields?: string[];
    selectedRecord?: Record<string, unknown>;
  };
};

export type InteractionRuntimeState = {
  data: {
    mainData: Record<string, unknown>;
    detailTables: Record<string, Array<Record<string, unknown>>>;
  };
  componentState: {
    fields: Record<string, BaseFieldState>;
    detailTables: Record<
      string,
      {
        visible: boolean;
        readonly: boolean;
        columns: Record<string, BaseFieldState>;
      }
    >;
  };
  queryCache: Record<
    string,
    {
      data: unknown;
      expiresAt: number;
    }
  >;
  validationErrors: Record<string, string[]>;
  initialized: boolean;
};

const initialState: InteractionRuntimeState = {
  data: {
    mainData: {},
    detailTables: {},
  },
  componentState: {
    fields: {},
    detailTables: {},
  },
  queryCache: {},
  validationErrors: {},
  initialized: false,
};

const interactionRuntimeSlice = createSlice({
  name: "interactionRuntime",
  initialState,
  reducers: {
    resetInteractionRuntimeState: () => initialState,
    initializeInteractionRuntime: (
      state,
      action: PayloadAction<{
        data: InteractionRuntimeState["data"];
        componentState: InteractionRuntimeState["componentState"];
      }>
    ) => {
      state.data = action.payload.data;
      state.componentState = action.payload.componentState;
      state.queryCache = {};
      state.validationErrors = {};
      state.initialized = true;
    },
    setMainFieldValue: (
      state,
      action: PayloadAction<{ fieldKey: string; value: unknown }>
    ) => {
      const { fieldKey, value } = action.payload;
      if (value === undefined || value === null || value === "") {
        delete state.data.mainData[fieldKey];
        return;
      }
      state.data.mainData[fieldKey] = value;
    },
    setDetailFieldValue: (
      state,
      action: PayloadAction<{ detailTableKey: string; rowIndex: number; fieldKey: string; value: unknown }>
    ) => {
      const { detailTableKey, rowIndex, fieldKey, value } = action.payload;
      const rows = [...(state.data.detailTables[detailTableKey] ?? [])];
      const row = { ...(rows[rowIndex] ?? {}) };
      if (value === undefined || value === null || value === "") {
        delete row[fieldKey];
      } else {
        row[fieldKey] = value;
      }
      rows[rowIndex] = row;
      state.data.detailTables[detailTableKey] = rows;
    },
    appendDetailRow: (
      state,
      action: PayloadAction<{ detailTableKey: string; rows: Array<Record<string, unknown>> }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = [
        ...(state.data.detailTables[action.payload.detailTableKey] ?? []),
        ...action.payload.rows,
      ];
    },
    removeDetailRow: (
      state,
      action: PayloadAction<{ detailTableKey: string; rowIndex: number }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = (
        state.data.detailTables[action.payload.detailTableKey] ?? []
      ).filter((_, index) => index !== action.payload.rowIndex);
    },
    replaceDetailRows: (
      state,
      action: PayloadAction<{ detailTableKey: string; rows: Array<Record<string, unknown>> }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = action.payload.rows;
    },
    applyFieldDerivedState: (
      state,
      action: PayloadAction<{ fieldKey: string; patch: Partial<BaseFieldState> }>
    ) => {
      const current = state.componentState.fields[action.payload.fieldKey];
      if (!current) {
        return;
      }
      state.componentState.fields[action.payload.fieldKey] = {
        ...current,
        ...action.payload.patch,
      };
    },
    applyDetailColumnDerivedState: (
      state,
      action: PayloadAction<{
        detailTableKey: string;
        fieldKey?: string;
        tablePatch?: Partial<InteractionRuntimeState["componentState"]["detailTables"][string]>;
        fieldPatch?: Partial<BaseFieldState>;
      }>
    ) => {
      const current = state.componentState.detailTables[action.payload.detailTableKey];
      if (!current) {
        return;
      }
      if (action.payload.tablePatch) {
        state.componentState.detailTables[action.payload.detailTableKey] = {
          ...current,
          ...action.payload.tablePatch,
        };
      }
      if (action.payload.fieldKey && action.payload.fieldPatch) {
        const column = current.columns[action.payload.fieldKey];
        if (!column) {
          return;
        }
        state.componentState.detailTables[action.payload.detailTableKey] = {
          ...state.componentState.detailTables[action.payload.detailTableKey],
          columns: {
            ...state.componentState.detailTables[action.payload.detailTableKey].columns,
            [action.payload.fieldKey]: {
              ...column,
              ...action.payload.fieldPatch,
            },
          },
        };
      }
    },
    applyComponentExtensionState: (
      state,
      action: PayloadAction<{ fieldKey: string; patch: Partial<BaseFieldState> }>
    ) => {
      const current = state.componentState.fields[action.payload.fieldKey];
      if (!current) {
        return;
      }
      state.componentState.fields[action.payload.fieldKey] = {
        ...current,
        ...action.payload.patch,
      };
    },
    setQueryCache: (
      state,
      action: PayloadAction<{ key: string; data: unknown; expiresAt: number }>
    ) => {
      state.queryCache[action.payload.key] = {
        data: action.payload.data,
        expiresAt: action.payload.expiresAt,
      };
    },
    setValidationErrors: (state, action: PayloadAction<Record<string, string[]>>) => {
      state.validationErrors = action.payload;
    },
    clearValidationError: (state, action: PayloadAction<string>) => {
      delete state.validationErrors[action.payload];
    },
  },
});

export const {
  resetInteractionRuntimeState,
  initializeInteractionRuntime,
  setMainFieldValue,
  setDetailFieldValue,
  appendDetailRow,
  removeDetailRow,
  replaceDetailRows,
  applyFieldDerivedState,
  applyDetailColumnDerivedState,
  applyComponentExtensionState,
  setQueryCache,
  setValidationErrors,
  clearValidationError,
} = interactionRuntimeSlice.actions;

export const interactionRuntimeReducer = interactionRuntimeSlice.reducer;
