import { request } from "../../../services/api";
import { PAGE_NODE_ID, createEmptyNodesById, type Node, type NodesById } from "../../../types/schema/node";

export type RuntimeFormResponse = {
  formId: number;
  formCode: string;
  name: string;
  description: string;
  versionId: number;
  versionNo: number;
  fields: Record<string, unknown>;
};

export type RecordDetailResponse = {
  id: number;
  formId: number;
  formVersionId: number;
  status: string;
  data: Record<string, unknown>;
};

export type RecordListItem = {
  id: number;
  formId: number;
  formVersionId: number;
  status: string;
  creatorId: number;
};

export type RuntimeForm = RuntimeFormResponse & {
  nodesById: NodesById;
};

function sortByOrder(a: Node, b: Node) {
  const aOrder = typeof a.layout.order === "number" ? a.layout.order : Number.MAX_SAFE_INTEGER;
  const bOrder = typeof b.layout.order === "number" ? b.layout.order : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  return a.id.localeCompare(b.id);
}

function deserializeFields(response: RuntimeFormResponse): RuntimeForm {
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
    ...response,
    nodesById,
  };
}

export async function loadRuntimeForm(formCode: string) {
  const response = await request<RuntimeFormResponse>(`/api/runtime/forms/${formCode}`);
  return deserializeFields(response);
}

export async function createRecord(formId: number, formVersionId: number, data: Record<string, unknown>) {
  return request<number>("/api/records", {
    method: "POST",
    body: JSON.stringify({
      formId,
      formVersionId,
      data,
    }),
  });
}

export async function saveRecordDraft(recordId: number, data: Record<string, unknown>) {
  return request<boolean>(`/api/records/${recordId}/draft`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

export async function submitRecord(recordId: number, data: Record<string, unknown>) {
  return request<boolean>(`/api/records/${recordId}/submit`, {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export async function loadRecordDetail(recordId: number) {
  return request<RecordDetailResponse>(`/api/records/${recordId}`);
}

export async function listRecordsByForm(formId: number) {
  return request<RecordListItem[]>(`/api/records/by-form/${formId}`);
}
