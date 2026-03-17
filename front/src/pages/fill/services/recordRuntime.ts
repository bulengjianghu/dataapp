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

export type RecordRuntimeData = {
  mainData: Record<string, unknown>;
  detailTables: Record<string, Array<Record<string, unknown>>>;
};

export type RecordDetailResponse = {
  id: number;
  formId: number;
  formVersionId: number;
  status: string;
  mainData: Record<string, unknown>;
  detailTables: Record<string, Array<Record<string, unknown>>>;
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

export type RelationRecord = {
  id: number;
  formId: number;
  formVersionId: number;
  status: string;
  mainData: Record<string, unknown>;
  detailTables: Record<string, Array<Record<string, unknown>>>;
};

export type RelationSearchResult = {
  totalCount: number;
  records: RelationRecord[];
};

function toRuntimePayload(data: RecordRuntimeData) {
  return {
    mainData: data.mainData ?? {},
    detailTables: data.detailTables ?? {},
  };
}

export async function createRecord(formId: number, formVersionId: number, data: RecordRuntimeData) {
  return request<number>("/api/records", {
    method: "POST",
    body: JSON.stringify({
      formId,
      formVersionId,
      ...toRuntimePayload(data),
    }),
  });
}

export async function saveRecordDraft(recordId: number, data: RecordRuntimeData) {
  return request<boolean>(`/api/records/${recordId}/draft`, {
    method: "PUT",
    body: JSON.stringify(toRuntimePayload(data)),
  });
}

export async function submitRecord(recordId: number, data: RecordRuntimeData) {
  return request<boolean>(`/api/records/${recordId}/submit`, {
    method: "POST",
    body: JSON.stringify(toRuntimePayload(data)),
  });
}

export async function loadRecordDetail(recordId: number) {
  return request<RecordDetailResponse>(`/api/records/${recordId}`);
}

export async function listRecordsByForm(formId: number) {
  return request<RecordListItem[]>(`/api/records/by-form/${formId}`);
}

export async function listRelationRecordsByForm(formId: number) {
  return request<RelationRecord[]>(`/api/records/relation/by-form/${formId}`);
}

function matchesFilter(record: RelationRecord, filter: Record<string, unknown>) {
  const fieldKey = typeof filter.fieldKey === "string" ? filter.fieldKey : "";
  const operator = typeof filter.operator === "string" ? filter.operator : "eq";
  const expected = filter.value;
  const actual = record.mainData[fieldKey];

  if (!fieldKey) {
    return true;
  }

  if (operator === "contains") {
    return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
  }

  return String(actual ?? "") === String(expected ?? "");
}

function matchesKeyword(record: RelationRecord, keyword: string, displayFields: string[]) {
  if (!keyword.trim()) {
    return true;
  }
  const normalized = keyword.trim().toLowerCase();
  const pool = [
    String(record.id),
    ...displayFields.map((fieldKey) => String(record.mainData[fieldKey] ?? "")),
  ];
  return pool.some((value) => value.toLowerCase().includes(normalized));
}

export async function searchRelationRecords({
  sourceFormId,
  keyword,
  displayFields,
  filters,
}: {
  sourceFormId: number;
  keyword: string;
  displayFields: string[];
  filters: Array<Record<string, unknown>>;
}): Promise<RelationSearchResult> {
  const records = await listRelationRecordsByForm(sourceFormId);
  return {
    totalCount: records.length,
    records: records.filter((record) => {
      if (!matchesKeyword(record, keyword, displayFields)) {
        return false;
      }
      return filters.every((filter) => matchesFilter(record, filter));
    }),
  };
}
