import { configureStore } from "@reduxjs/toolkit";
import { editorHistoryReducer } from "./slices/editorHistorySlice";
import { formSchemaReducer } from "./slices/formSchemaSlice";

export const store = configureStore({
  reducer: {
    formSchema: formSchemaReducer,
    editorHistory: editorHistoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
