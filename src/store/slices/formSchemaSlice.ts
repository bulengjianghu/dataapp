import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { PAGE_NODE_ID, createEmptyNodesById, type Node, type NodeType, type NodesById } from "../../types/schema/node";

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

type AddNodePayload = {
  type: NodeType;
  targetParentId: string;
  targetIndex?: number;
  props?: Record<string, unknown>;
  layout?: Node["layout"];
};

type MoveNodePayload = {
  nodeId: string;
  targetParentId: string;
  targetIndex?: number;
};

function createNode(type: NodeType, props?: Record<string, unknown>, layout?: Node["layout"]): Node {
  return {
    id: `tmp_${Math.random().toString(36).slice(2, 10)}`,
    serverId: null,
    type,
    parentId: null,
    childrenIds: [],
    props: props ?? {},
    layout: layout ?? {},
  };
}

function normalizeInsertIndex(length: number, index?: number): number {
  if (index === undefined) {
    return length;
  }
  if (index < 0) {
    return 0;
  }
  if (index > length) {
    return length;
  }
  return index;
}

function removeFromParent(nodesById: NodesById, nodeId: string) {
  const node = nodesById[nodeId];
  if (!node || !node.parentId) {
    return;
  }
  const parent = nodesById[node.parentId];
  if (!parent) {
    return;
  }
  parent.childrenIds = parent.childrenIds.filter((id) => id !== nodeId);
}

function isDescendant(nodesById: NodesById, ancestorId: string, maybeDescendantId: string): boolean {
  const ancestor = nodesById[ancestorId];
  if (!ancestor) {
    return false;
  }
  if (ancestor.childrenIds.includes(maybeDescendantId)) {
    return true;
  }
  return ancestor.childrenIds.some((childId) => isDescendant(nodesById, childId, maybeDescendantId));
}

function reorderParentChildrenByOrder(nodesById: NodesById, parentId: string) {
  const parent = nodesById[parentId];
  if (!parent) {
    return;
  }

  const indexedChildren = parent.childrenIds.map((childId, index) => ({
    childId,
    index,
    order: nodesById[childId]?.layout.order,
  }));

  indexedChildren.sort((left, right) => {
    const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.index - right.index;
  });

  parent.childrenIds = indexedChildren.map((item) => item.childId);
}

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
    addNode(state, action: PayloadAction<AddNodePayload>) {
      const { type, targetParentId, targetIndex, props, layout } = action.payload;
      const parent = state.nodesById[targetParentId];
      if (!parent) {
        return;
      }
      if (parent.type !== "page" && parent.type !== "container") {
        return;
      }

      const node = createNode(type, props, layout);
      node.parentId = targetParentId;
      state.nodesById[node.id] = node;

      const insertIndex = normalizeInsertIndex(parent.childrenIds.length, targetIndex);
      parent.childrenIds.splice(insertIndex, 0, node.id);
      state.selectedNodeKey = node.id;
      state.dirty = true;
    },
    moveNode(state, action: PayloadAction<MoveNodePayload>) {
      const { nodeId, targetParentId, targetIndex } = action.payload;
      if (nodeId === PAGE_NODE_ID || nodeId === targetParentId) {
        return;
      }
      const node = state.nodesById[nodeId];
      const targetParent = state.nodesById[targetParentId];
      if (!node || !targetParent) {
        return;
      }
      if (targetParent.type !== "page" && targetParent.type !== "container") {
        return;
      }
      if (node.type === "container" && isDescendant(state.nodesById, nodeId, targetParentId)) {
        return;
      }

      const prevParentId = node.parentId;
      const prevParent = prevParentId ? state.nodesById[prevParentId] : null;
      const prevIndex = prevParent ? prevParent.childrenIds.findIndex((id) => id === nodeId) : -1;
      removeFromParent(state.nodesById, nodeId);
      node.parentId = targetParentId;

      let nextIndex = normalizeInsertIndex(targetParent.childrenIds.length, targetIndex);
      if (prevParentId === targetParentId) {
        // Same-parent reorder needs index correction after removal.
        if (prevIndex !== -1 && prevIndex < nextIndex) {
          nextIndex -= 1;
        }
      }
      targetParent.childrenIds.splice(nextIndex, 0, nodeId);
      state.selectedNodeKey = nodeId;
      state.dirty = true;
    },
    updateNodeProps(
      state,
      action: PayloadAction<{
        nodeId: string;
        patch: Record<string, unknown>;
      }>
    ) {
      const node = state.nodesById[action.payload.nodeId];
      if (!node) {
        return;
      }

      node.props = {
        ...node.props,
        ...action.payload.patch,
      };
      state.dirty = true;
    },
    updateNodeLayout(
      state,
      action: PayloadAction<{
        nodeId: string;
        patch: Node["layout"];
      }>
    ) {
      const node = state.nodesById[action.payload.nodeId];
      if (!node) {
        return;
      }

      node.layout = {
        ...node.layout,
        ...action.payload.patch,
      };

      if (node.parentId && typeof action.payload.patch.order === "number") {
        reorderParentChildrenByOrder(state.nodesById, node.parentId);
      }

      state.dirty = true;
    },
    moveNodeToContainer(state, action: PayloadAction<{ nodeId: string; containerId: string; index?: number }>) {
      const { nodeId, containerId, index } = action.payload;
      const container = state.nodesById[containerId];
      if (!container || container.type !== "container") {
        return;
      }
      formSchemaSlice.caseReducers.moveNode(state, {
        type: "formSchema/moveNode",
        payload: {
          nodeId,
          targetParentId: containerId,
          targetIndex: index,
        },
      });
    },
    markDirty(state, action: PayloadAction<boolean>) {
      state.dirty = action.payload;
    },
    resetSchemaState() {
      return initialState;
    },
  },
});

export const {
  setFormId,
  selectNode,
  setNodesById,
  addNode,
  moveNode,
  moveNodeToContainer,
  updateNodeProps,
  updateNodeLayout,
  markDirty,
  resetSchemaState,
} =
  formSchemaSlice.actions;

export const formSchemaReducer = formSchemaSlice.reducer;
