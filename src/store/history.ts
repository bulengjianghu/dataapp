import type { FormSchemaState } from "./slices/formSchemaSlice";

export type FormSchemaSnapshot = Pick<FormSchemaState, "formId" | "nodesById" | "selectedNodeKey" | "dirty">;

export function createHistorySnapshot(state: FormSchemaState): string {
  return JSON.stringify({
    formId: state.formId,
    nodesById: state.nodesById,
    selectedNodeKey: state.selectedNodeKey,
    dirty: state.dirty,
  } satisfies FormSchemaSnapshot);
}

export function parseHistorySnapshot(snapshot: string): FormSchemaSnapshot {
  return JSON.parse(snapshot) as FormSchemaSnapshot;
}
