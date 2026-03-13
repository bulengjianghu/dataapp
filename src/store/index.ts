import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { createHistorySnapshot, parseHistorySnapshot } from "./history";
import {
  clearHistory,
  editorHistoryReducer,
  initializeHistory,
  pushSnapshot,
  redo,
  replacePresentSnapshot,
  undo,
} from "./slices/editorHistorySlice";
import {
  addNode,
  deleteNode,
  deleteSelectedNode,
  formSchemaReducer,
  markDirty,
  moveNode,
  moveNodeToContainer,
  resetSchemaState,
  restoreSchemaSnapshot,
  updateNodeLayout,
  updateNodeProps,
} from "./slices/formSchemaSlice";

type StoreState = {
  formSchema: ReturnType<typeof formSchemaReducer>;
  editorHistory: ReturnType<typeof editorHistoryReducer>;
};

const historyTrackedActionTypes = new Set<string>([
  addNode.type,
  moveNode.type,
  moveNodeToContainer.type,
  updateNodeProps.type,
  updateNodeLayout.type,
  deleteSelectedNode.type,
  deleteNode.type,
]);

const historyMiddleware: Middleware = (api) => (next) => (action) => {
  const previousState = api.getState() as StoreState;
  const typedAction = action as { type?: string; payload?: unknown };

  if (undo.match(action)) {
    const targetSnapshot =
      previousState.editorHistory.past[previousState.editorHistory.past.length - 1] ?? null;
    const result = next(action);
    if (targetSnapshot) {
      api.dispatch(restoreSchemaSnapshot(parseHistorySnapshot(targetSnapshot)));
    }
    return result;
  }

  if (redo.match(action)) {
    const targetSnapshot = previousState.editorHistory.future[0] ?? null;
    const result = next(action);
    if (targetSnapshot) {
      api.dispatch(restoreSchemaSnapshot(parseHistorySnapshot(targetSnapshot)));
    }
    return result;
  }

  const result = next(action);

  if (typedAction.type && historyTrackedActionTypes.has(typedAction.type)) {
    api.dispatch(pushSnapshot(createHistorySnapshot((api.getState() as StoreState).formSchema)));
  }

  if (restoreSchemaSnapshot.match(action) || (markDirty.match(action) && action.payload === false)) {
    api.dispatch(replacePresentSnapshot(createHistorySnapshot((api.getState() as StoreState).formSchema)));
  }

  if (resetSchemaState.match(action)) {
    api.dispatch(clearHistory());
    api.dispatch(initializeHistory(createHistorySnapshot((api.getState() as StoreState).formSchema)));
  }

  return result;
};

export const store = configureStore({
  reducer: {
    formSchema: formSchemaReducer,
    editorHistory: editorHistoryReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(historyMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

store.dispatch(initializeHistory(createHistorySnapshot(store.getState().formSchema)));
