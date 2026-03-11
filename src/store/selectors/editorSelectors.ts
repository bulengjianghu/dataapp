import type { RootState } from "../index";

export const selectFormId = (state: RootState) => state.formSchema.formId;
export const selectNodesById = (state: RootState) => state.formSchema.nodesById;
export const selectSelectedNodeKey = (state: RootState) => state.formSchema.selectedNodeKey;
export const selectDirty = (state: RootState) => state.formSchema.dirty;

export const selectHistoryPastCount = (state: RootState) => state.editorHistory.past.length;
export const selectHistoryFutureCount = (state: RootState) => state.editorHistory.future.length;
export const selectPresentHash = (state: RootState) => state.editorHistory.presentHash;
