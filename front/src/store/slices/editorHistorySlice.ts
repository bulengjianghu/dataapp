import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type EditorHistoryState = {
  past: string[];
  future: string[];
  presentHash: string | null;
};

const MAX_HISTORY_LENGTH = 50;

const initialState: EditorHistoryState = {
  past: [],
  future: [],
  presentHash: null,
};

const editorHistorySlice = createSlice({
  name: "editorHistory",
  initialState,
  reducers: {
    initializeHistory(state, action: PayloadAction<string>) {
      state.past = [];
      state.future = [];
      state.presentHash = action.payload;
    },
    pushSnapshot(state, action: PayloadAction<string>) {
      if (state.presentHash === action.payload) {
        return;
      }
      if (state.presentHash !== null) {
        state.past.push(state.presentHash);
        if (state.past.length > MAX_HISTORY_LENGTH) {
          state.past.shift();
        }
      }
      state.presentHash = action.payload;
      state.future = [];
    },
    replacePresentSnapshot(state, action: PayloadAction<string>) {
      state.presentHash = action.payload;
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

export const { initializeHistory, pushSnapshot, replacePresentSnapshot, undo, redo, clearHistory } =
  editorHistorySlice.actions;
export const editorHistoryReducer = editorHistorySlice.reducer;
