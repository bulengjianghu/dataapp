import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type FormSchemaState = {
  formId: string | null;
  nodesById: Record<string, unknown>;
  selectedNodeKey: string | null;
  dirty: boolean;
};

const initialState: FormSchemaState = {
  formId: null,
  nodesById: {},
  selectedNodeKey: null,
  dirty: false,
};

const formSchemaSlice = createSlice({
  name: "formSchema",
  initialState,
  reducers: {
    setFormId(state, action: PayloadAction<string | null>) {
      state.formId = action.payload;
    },
    selectNode(state, action: PayloadAction<string | null>) {
      state.selectedNodeKey = action.payload;
    },
    setNodesById(state, action: PayloadAction<Record<string, unknown>>) {
      state.nodesById = action.payload;
    },
    markDirty(state, action: PayloadAction<boolean>) {
      state.dirty = action.payload;
    },
    resetSchemaState() {
      return initialState;
    },
  },
});

export const { setFormId, selectNode, setNodesById, markDirty, resetSchemaState } =
  formSchemaSlice.actions;

export const formSchemaReducer = formSchemaSlice.reducer;
