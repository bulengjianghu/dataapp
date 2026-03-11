import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type EditorHistoryState = {
  past: string[];
  future: string[];
  presentHash: string | null;
};

const initialState: EditorHistoryState = {
  past: [],
  future: [],
  presentHash: null,
};

const editorHistorySlice = createSlice({
  name: "editorHistory",
  initialState,
  reducers: {
    pushSnapshot(state, action: PayloadAction<string>) {
      if (state.presentHash !== null) {
        state.past.push(state.presentHash);
      }
      state.presentHash = action.payload;
      state.future = [];
    },
    undo(state) {
      if (state.past.length === 0) {
        return;
      }
      const previous = state.past.pop() as string;
      if (state.presentHash !== null) {
        state.future.unshift(state.presentHash);
      }
      state.presentHash = previous;
    },
    redo(state) {
      if (state.future.length === 0) {
        return;
      }
      const next = state.future.shift() as string;
      if (state.presentHash !== null) {
        state.past.push(state.presentHash);
      }
      state.presentHash = next;
    },
    clearHistory() {
      return initialState;
    },
  },
});

export const { pushSnapshot, undo, redo, clearHistory } = editorHistorySlice.actions;
export const editorHistoryReducer = editorHistorySlice.reducer;
