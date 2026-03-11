import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createEmptyNodesById, type NodesById } from "../../types/schema/node";

export type FormSchemaState = {
  formId: string | null;
  nodesById: NodesById;
  selectedNodeKey: string | null;
  dirty: boolean;
};

const initialState: FormSchemaState = {
  formId: null,
  nodesById: createEmptyNodesById(),
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
    setNodesById(state, action: PayloadAction<NodesById>) {
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
