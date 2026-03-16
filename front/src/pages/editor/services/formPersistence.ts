import { PAGE_NODE_ID, createEmptyNodesById, type Node, type NodesById } from "../../../types/schema/node";
import { request } from "../../../services/api";

type CreateFormResponse = {
  formId: number;
  formCode: string;
};

type DraftResponse = {
  formId: number;
  formCode: string;
  name: string;
  description: string;
  status: string;
  draftVersion: number;
  fields: Record<string, unknown>;
};

type PublishResponse = {
  formId: number;
  formCode: string;
  name: string;
  description: string;
  versionId: number;
  versionNo: number;
  status: string;
  fields: Record<string, unknown>;
};

type PersistedDraft = {
  formId: string;
  nodesById: NodesById;
};

function getPageMeta(nodesById: NodesById) {
  const pageRoot = nodesById[PAGE_NODE_ID];
  const rawTitle = typeof pageRoot?.props.title === "string" ? pageRoot.props.title.trim() : "";
  return {
    name: rawTitle || "未命名表单",
    description: typeof pageRoot?.props.description === "string" ? pageRoot.props.description : "",
  };
}

function buildTraversalOrder(nodesById: NodesById) {
  const visited = new Set<string>();
  const order: string[] = [];

  const visit = (nodeId: string) => {
    if (nodeId === PAGE_NODE_ID || visited.has(nodeId)) {
      return;
    }
    const node = nodesById[nodeId];
    if (!node) {
      return;
    }
    visited.add(nodeId);
    order.push(nodeId);
    node.childrenIds.forEach(visit);
  };

  nodesById[PAGE_NODE_ID]?.childrenIds.forEach(visit);
  Object.keys(nodesById).forEach(visit);
  return order;
}

function getSiblingOrders(nodesById: NodesById) {
  const orders = new Map<string, number>();

  Object.values(nodesById).forEach((node) => {
    node.childrenIds.forEach((childId, index) => {
      orders.set(childId, index);
    });
  });

  return orders;
}

function serializeDraft(nodesById: NodesById) {
  const siblingOrders = getSiblingOrders(nodesById);
  const fields: Record<string, Node> = {};

  buildTraversalOrder(nodesById).forEach((nodeId) => {
    const node = nodesById[nodeId];
    if (!node || node.id === PAGE_NODE_ID) {
      return;
    }

    fields[node.id] = {
      ...node,
      parentId: node.parentId === PAGE_NODE_ID ? null : node.parentId,
      childrenIds: [...node.childrenIds],
      layout: {
        ...node.layout,
        order: siblingOrders.get(node.id) ?? node.layout.order,
      },
    };
  });

  return fields;
}

function sortByOrder(a: Node, b: Node) {
  const aOrder = typeof a.layout.order === "number" ? a.layout.order : Number.MAX_SAFE_INTEGER;
  const bOrder = typeof b.layout.order === "number" ? b.layout.order : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  return a.id.localeCompare(b.id);
}

function deserializeDraft(response: DraftResponse | PublishResponse): PersistedDraft {
  const nodesById = createEmptyNodesById();
  nodesById[PAGE_NODE_ID].props = {
    title: response.name,
    description: response.description,
  };

  Object.entries(response.fields ?? {}).forEach(([nodeId, rawNode]) => {
    const node = rawNode as Node;
    nodesById[nodeId] = {
      ...node,
      parentId: node.parentId ?? PAGE_NODE_ID,
      childrenIds: Array.isArray(node.childrenIds) ? [...node.childrenIds] : [],
      props: { ...(node.props ?? {}) },
      layout: { ...(node.layout ?? {}) },
    };
  });

  nodesById[PAGE_NODE_ID].childrenIds = Object.values(nodesById)
    .filter((node) => node.id !== PAGE_NODE_ID && node.parentId === PAGE_NODE_ID)
    .sort(sortByOrder)
    .map((node) => node.id);

  return {
    formId: String(response.formId),
    nodesById,
  };
}

async function createForm(name: string) {
  return request<CreateFormResponse>("/api/admin/forms", {
    method: "POST",
    body: JSON.stringify({
      name,
    }),
  });
}

export async function createFormOnServer(name = "未命名表单"): Promise<string> {
  const created = await createForm(name);
  return String(created.formId);
}

export async function loadDraftFromServer(formId: string) {
  const draft = await request<DraftResponse>(`/api/admin/forms/${formId}/draft`);
  return deserializeDraft(draft);
}

export async function saveDraftToServer({
  formId,
  nodesById,
  keepalive,
}: {
  formId: string;
  nodesById: NodesById;
  keepalive?: boolean;
}) {
  const pageMeta = getPageMeta(nodesById);
  const fields = serializeDraft(nodesById);

  const saved = await request<DraftResponse>(`/api/admin/forms/${formId}/draft`, {
    method: "PUT",
    body: JSON.stringify({
      name: pageMeta.name,
      description: pageMeta.description,
      fields,
    }),
    keepalive,
  });

  return deserializeDraft(saved);
}

export async function publishFormToServer({ formId }: { formId: string }) {
  const published = await request<PublishResponse>(`/api/admin/forms/${formId}/publish`, {
    method: "POST",
  });
  return deserializeDraft(published);
}

export function validateBeforePublish(nodesById: NodesById, pageRootId: string) {
  const errors: string[] = [];
  const pageRoot = nodesById[pageRootId];
  const pageTitle = typeof pageRoot?.props.title === "string" ? pageRoot.props.title.trim() : "";

  if (!pageTitle) {
    errors.push("页面标题不能为空");
  }

  Object.values(nodesById).forEach((node) => {
    if (node.type === "field") {
      const label = typeof node.props.label === "string" ? node.props.label.trim() : "";
      if (!label) {
        errors.push(`字段 ${node.id} 缺少标题`);
      }

      const component = typeof node.props.component === "string" ? node.props.component : "";
      if (["radio", "checkbox", "select"].includes(component)) {
        const options = node.props.options;
        if (!Array.isArray(options) || options.length === 0) {
          errors.push(`字段 ${label || node.id} 需要至少一个选项`);
        }
      }
    }
  });

  return errors;
}
