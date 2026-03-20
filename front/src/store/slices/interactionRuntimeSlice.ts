import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type RuntimeOption = {
  label: string;
  value: string;
  raw?: Record<string, unknown>;
};

export type BaseRuntimeFieldState = {
  componentType: string;
  visible: boolean;
  readonly: boolean;
  required: boolean;
  disabled: boolean;
  hint?: string;
  loading?: boolean;
  winnerRuleIds: string[];
};

export type SelectFieldState = BaseRuntimeFieldState & {
  componentType: "select" | "radio" | "checkbox";
  select: {
    options: RuntimeOption[];
  };
};

export type RelationSelectFieldState = BaseRuntimeFieldState & {
  componentType: "relation-select";
  relation: {
    options: RuntimeOption[];
    filter?: Record<string, unknown>;
    sourceFormId?: string;
    displayFields?: string[];
    selectedRecord?: Record<string, unknown>;
  };
};

export type RuntimeFieldState =
  | BaseRuntimeFieldState
  | SelectFieldState
  | RelationSelectFieldState;

export type BaseFieldState = RuntimeFieldState;

export type DetailRowRuntime = {
  __rowId: string;
  __version: number;
  __status?: "active" | "created" | "updated" | "deleted";
  __origin?: "default" | "user" | "relation_fill" | "server";
  values: Record<string, unknown>;
};

export type DetailTableRuntimeState = {
  visible: boolean;
  readonly: boolean;
  columns: Record<string, RuntimeFieldState>;
};

export type InteractionRuntimeState = {
  data: {
    mainData: Record<string, unknown>;
    detailTables: Record<string, DetailRowRuntime[]>;
  };
  componentState: {
    fields: Record<string, RuntimeFieldState>;
    detailTables: Record<string, DetailTableRuntimeState>;
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

export function createDetailRowRuntime(
  values: Record<string, unknown> = {},
  options?: Partial<Pick<DetailRowRuntime, "__rowId" | "__version" | "__status" | "__origin">>
): DetailRowRuntime {
  return {
    __rowId: options?.__rowId ?? `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    __version: options?.__version ?? 1,
    __status: options?.__status ?? "created",
    __origin: options?.__origin ?? "user",
    values: { ...values },
  };
}

export function normalizeDetailRows(rows: Array<Record<string, unknown> | DetailRowRuntime> | undefined) {
  return (rows ?? []).map((row) => {
    if (isDetailRowRuntime(row)) {
      return {
        ...row,
        values: { ...row.values },
      };
    }
    return createDetailRowRuntime(row ?? {}, { __origin: "server", __status: "active" });
  });
}

export function isDetailRowRuntime(row: Record<string, unknown> | DetailRowRuntime): row is DetailRowRuntime {
  return typeof row === "object" && row !== null && "__rowId" in row && "values" in row;
}

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

function mergeFieldState(
  current: RuntimeFieldState | undefined,
  patch: Partial<RuntimeFieldState>
): RuntimeFieldState | undefined {
  if (!current) {
    return current;
  }
  return {
    ...current,
    ...patch,
    select:
      "select" in current || "select" in patch
        ? {
            ...(("select" in current && current.select) || {}),
            ...(("select" in patch && patch.select) || {}),
          }
        : undefined,
    relation:
      "relation" in current || "relation" in patch
        ? {
            ...(("relation" in current && current.relation) || {}),
            ...(("relation" in patch && patch.relation) || {}),
          }
        : undefined,
  } as RuntimeFieldState;
}

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
      state.data = {
        mainData: { ...(action.payload.data.mainData ?? {}) },
        detailTables: Object.fromEntries(
          Object.entries(action.payload.data.detailTables ?? {}).map(([detailTableKey, rows]) => [
            detailTableKey,
            normalizeDetailRows(rows),
          ])
        ),
      };
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
      action: PayloadAction<{ detailTableKey: string; rowId: string; fieldKey: string; value: unknown }>
    ) => {
      const { detailTableKey, rowId, fieldKey, value } = action.payload;
      const rows = state.data.detailTables[detailTableKey] ?? [];
      state.data.detailTables[detailTableKey] = rows.map((row) => {
        if (row.__rowId !== rowId) {
          return row;
        }
        const nextValues = { ...row.values };
        if (value === undefined || value === null || value === "") {
          delete nextValues[fieldKey];
        } else {
          nextValues[fieldKey] = value;
        }
        return {
          ...row,
          __version: row.__version + 1,
          __status: row.__origin === "server" ? "updated" : row.__status,
          values: nextValues,
        };
      });
    },
    appendDetailRows: (
      state,
      action: PayloadAction<{
        detailTableKey: string;
        rows: Array<Record<string, unknown> | DetailRowRuntime>;
      }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = [
        ...(state.data.detailTables[action.payload.detailTableKey] ?? []),
        ...normalizeDetailRows(action.payload.rows),
      ];
    },
    updateDetailRow: (
      state,
      action: PayloadAction<{
        detailTableKey: string;
        rowId: string;
        patch: Record<string, unknown>;
      }>
    ) => {
      const rows = state.data.detailTables[action.payload.detailTableKey] ?? [];
      state.data.detailTables[action.payload.detailTableKey] = rows.map((row) => {
        if (row.__rowId !== action.payload.rowId) {
          return row;
        }
        const nextValues = {
          ...row.values,
          ...action.payload.patch,
        };
        Object.keys(nextValues).forEach((fieldKey) => {
          const value = nextValues[fieldKey];
          if (value === undefined || value === null || value === "") {
            delete nextValues[fieldKey];
          }
        });
        return {
          ...row,
          __version: row.__version + 1,
          __status: row.__origin === "server" ? "updated" : row.__status,
          values: nextValues,
        };
      });
    },
    removeDetailRow: (
      state,
      action: PayloadAction<{ detailTableKey: string; rowId: string }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = (
        state.data.detailTables[action.payload.detailTableKey] ?? []
      ).filter((row) => row.__rowId !== action.payload.rowId);
    },
    replaceDetailRows: (
      state,
      action: PayloadAction<{
        detailTableKey: string;
        rows: Array<Record<string, unknown> | DetailRowRuntime>;
      }>
    ) => {
      state.data.detailTables[action.payload.detailTableKey] = normalizeDetailRows(action.payload.rows);
    },
    applyFieldDerivedState: (
      state,
      action: PayloadAction<{ fieldKey: string; patch: Partial<BaseRuntimeFieldState> }>
    ) => {
      const current = state.componentState.fields[action.payload.fieldKey];
      const next = mergeFieldState(current, action.payload.patch);
      if (next) {
        state.componentState.fields[action.payload.fieldKey] = next;
      }
    },
    applyDetailColumnDerivedState: (
      state,
      action: PayloadAction<{
        detailTableKey: string;
        fieldKey?: string;
        tablePatch?: Partial<DetailTableRuntimeState>;
        fieldPatch?: Partial<RuntimeFieldState>;
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
        const next = mergeFieldState(column, action.payload.fieldPatch);
        if (!next) {
          return;
        }
        state.componentState.detailTables[action.payload.detailTableKey] = {
          ...state.componentState.detailTables[action.payload.detailTableKey],
          columns: {
            ...state.componentState.detailTables[action.payload.detailTableKey].columns,
            [action.payload.fieldKey]: next,
          },
        };
      }
    },
    applyComponentExtensionState: (
      state,
      action: PayloadAction<{ fieldKey: string; patch: Partial<RuntimeFieldState> }>
    ) => {
      const current = state.componentState.fields[action.payload.fieldKey];
      const next = mergeFieldState(current, action.payload.patch);
      if (next) {
        state.componentState.fields[action.payload.fieldKey] = next;
      }
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
  appendDetailRows,
  updateDetailRow,
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
