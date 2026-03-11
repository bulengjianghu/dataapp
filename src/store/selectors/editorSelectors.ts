import type { RootState } from "../index";
import { PAGE_NODE_ID } from "../../types/schema/node";

export const selectFormId = (state: RootState) => state.formSchema.formId;
export const selectNodesById = (state: RootState) => state.formSchema.nodesById;
export const selectSelectedNodeKey = (state: RootState) => state.formSchema.selectedNodeKey;
export const selectDirty = (state: RootState) => state.formSchema.dirty;
export const selectPageRootNode = (state: RootState) => state.formSchema.nodesById[PAGE_NODE_ID];
export const selectPageChildrenIds = (state: RootState) =>
  state.formSchema.nodesById[PAGE_NODE_ID]?.childrenIds ?? [];

export const selectHistoryPastCount = (state: RootState) => state.editorHistory.past.length;
export const selectHistoryFutureCount = (state: RootState) => state.editorHistory.future.length;
export const selectPresentHash = (state: RootState) => state.editorHistory.presentHash;
