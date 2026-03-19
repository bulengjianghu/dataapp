import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type RuleNodeType =
  | "trigger"
  | "condition"
  | "query"
  | "transform"
  | "command"
  | "context"
  | "notice";

export type RuleGraphNode = {
  id: string;
  type: RuleNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

export type RuleGraphEdge = {
  id: string;
  source: string;
  target: string;
  branch?: "success" | "failure" | "true" | "false" | "empty" | "nonEmpty";
};

export type RuleGraphDiagnostic = {
  id: string;
  level: "error" | "warning";
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
};

export type RuleReferenceSummary = {
  fields: string[];
  detailTables: string[];
  forms: string[];
  events: string[];
};

export type InteractionRuleGraphState = {
  formId: string | null;
  formVersionId: string | null;
  ruleId: string | null;
  graph: {
    nodes: RuleGraphNode[];
    edges: RuleGraphEdge[];
    viewport: { x: number; y: number; zoom: number };
  };
  selectedNodeId: string | null;
  diagnostics: RuleGraphDiagnostic[];
  references: RuleReferenceSummary;
  dirty: boolean;
};

const emptyReferences: RuleReferenceSummary = {
  fields: [],
  detailTables: [],
  forms: [],
  events: [],
};

const initialState: InteractionRuleGraphState = {
  formId: null,
  formVersionId: null,
  ruleId: null,
  graph: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  selectedNodeId: null,
  diagnostics: [],
  references: emptyReferences,
  dirty: false,
};

const interactionRuleGraphSlice = createSlice({
  name: "interactionRuleGraph",
  initialState,
  reducers: {
    resetInteractionRuleGraphState: () => initialState,
    initializeRuleGraph: (
      state,
      action: PayloadAction<{
        formId: string | null;
        ruleId: string | null;
        graph?: Partial<InteractionRuleGraphState["graph"]>;
      }>
    ) => {
      state.formId = action.payload.formId;
      state.ruleId = action.payload.ruleId;
      state.graph = {
        nodes: action.payload.graph?.nodes ?? [],
        edges: action.payload.graph?.edges ?? [],
        viewport: action.payload.graph?.viewport ?? { x: 0, y: 0, zoom: 1 },
      };
      state.selectedNodeId = action.payload.graph?.nodes?.[0]?.id ?? null;
      state.diagnostics = [];
      state.references = emptyReferences;
      state.dirty = false;
    },
    addRuleNode: (state, action: PayloadAction<RuleGraphNode>) => {
      state.graph.nodes.push(action.payload);
      state.selectedNodeId = action.payload.id;
      state.dirty = true;
    },
    updateRuleNodeData: (
      state,
      action: PayloadAction<{ nodeId: string; patch: Record<string, unknown> }>
    ) => {
      const target = state.graph.nodes.find((item) => item.id === action.payload.nodeId);
      if (!target) {
        return;
      }
      target.data = {
        ...target.data,
        ...action.payload.patch,
      };
      state.dirty = true;
    },
    moveRuleNode: (
      state,
      action: PayloadAction<{ nodeId: string; position: { x: number; y: number } }>
    ) => {
      const target = state.graph.nodes.find((item) => item.id === action.payload.nodeId);
      if (!target) {
        return;
      }
      target.position = action.payload.position;
      state.dirty = true;
    },
    removeRuleNode: (state, action: PayloadAction<string>) => {
      state.graph.nodes = state.graph.nodes.filter((item) => item.id !== action.payload);
      state.graph.edges = state.graph.edges.filter(
        (item) => item.source !== action.payload && item.target !== action.payload
      );
      if (state.selectedNodeId === action.payload) {
        state.selectedNodeId = state.graph.nodes[0]?.id ?? null;
      }
      state.dirty = true;
    },
    connectRuleNodes: (state, action: PayloadAction<RuleGraphEdge>) => {
      state.graph.edges.push(action.payload);
      state.dirty = true;
    },
    removeRuleEdge: (state, action: PayloadAction<string>) => {
      state.graph.edges = state.graph.edges.filter((item) => item.id !== action.payload);
      state.dirty = true;
    },
    selectRuleNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    setRuleDiagnostics: (state, action: PayloadAction<RuleGraphDiagnostic[]>) => {
      state.diagnostics = action.payload;
    },
    setRuleReferences: (state, action: PayloadAction<RuleReferenceSummary>) => {
      state.references = action.payload;
    },
    markRuleGraphDirty: (state, action: PayloadAction<boolean>) => {
      state.dirty = action.payload;
    },
  },
});

export const {
  resetInteractionRuleGraphState,
  initializeRuleGraph,
  addRuleNode,
  updateRuleNodeData,
  moveRuleNode,
  removeRuleNode,
  connectRuleNodes,
  removeRuleEdge,
  selectRuleNode,
  setRuleDiagnostics,
  setRuleReferences,
  markRuleGraphDirty,
} = interactionRuleGraphSlice.actions;

export const interactionRuleGraphReducer = interactionRuleGraphSlice.reducer;
