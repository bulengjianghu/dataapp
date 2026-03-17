export const PAGE_NODE_ID = "page_root" as const;

export type NodeType = "page" | "container" | "detail_table" | "field" | "text";

export type Node = {
  id: string;
  serverId: string | null;
  type: NodeType;
  parentId: string | null;
  childrenIds: string[];
  props: Record<string, unknown>;
  layout: {
    span?: number;
    order?: number;
  };
};

export type NodesById = Record<string, Node>;

export function createPageRootNode(): Node {
  return {
    id: PAGE_NODE_ID,
    serverId: null,
    type: "page",
    parentId: null,
    childrenIds: [],
    props: {},
    layout: {},
  };
}

export function createEmptyNodesById(): NodesById {
  return {
    [PAGE_NODE_ID]: createPageRootNode(),
  };
}
