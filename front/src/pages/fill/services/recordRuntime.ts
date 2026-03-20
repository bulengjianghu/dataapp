import { request } from "../../../services/api";
import { PAGE_NODE_ID, createEmptyNodesById, type Node, type NodesById } from "../../../types/schema/node";
import { normalizeDetailRows, type DetailRowRuntime } from "../../../store/slices/interactionRuntimeSlice";

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
  detailTables: Record<string, DetailRowRuntime[]>;
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

export async function loadRuntimeFormById(formId: number) {
  const response = await request<RuntimeFormResponse>(`/api/runtime/forms/by-id/${formId}`);
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

function findFieldNodeByServerId(nodesById: NodesById, serverId: string) {
  return Object.values(nodesById).find(
    (node) => node.type === "field" && typeof node.serverId === "string" && node.serverId === serverId
  );
}

function readOptionLabel(node: Node | undefined, rawValue: unknown) {
  if (!node || !Array.isArray(node.props.options)) {
    return null;
  }
  const matched = node.props.options.find(
    (item): item is { label?: unknown; value?: unknown } =>
      typeof item === "object" && item !== null && String(item.value ?? "") === String(rawValue ?? "")
  );
  return typeof matched?.label === "string" ? matched.label : null;
}

function normalizeComparableTexts(node: Node | undefined, value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeComparableTexts(node, item));
  }
  if (value == null) {
    return [];
  }
  const rawText = String(value).trim();
  const texts = rawText ? [rawText.toLowerCase(), rawText.replace(/\s+/g, "").toLowerCase()] : [];
  const optionLabel = readOptionLabel(node, value);
  if (optionLabel && optionLabel.trim()) {
    texts.push(optionLabel.trim().toLowerCase(), optionLabel.replace(/\s+/g, "").trim().toLowerCase());
  }
  return Array.from(new Set(texts.filter(Boolean)));
}

export function formatRelationDisplayValue(nodesById: NodesById | undefined, fieldKey: string, value: unknown): string {
  const fieldNode = nodesById ? findFieldNodeByServerId(nodesById, fieldKey) : undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => formatRelationDisplayValue(nodesById, fieldKey, item))
      .filter(Boolean)
      .join("、");
  }
  if (value == null) {
    return "";
  }
  return readOptionLabel(fieldNode, value) ?? String(value);
}

export function getRelationFieldLabel(nodesById: NodesById | undefined, fieldKey: string) {
  const fieldNode = nodesById ? findFieldNodeByServerId(nodesById, fieldKey) : undefined;
  if (!fieldNode) {
    return fieldKey;
  }
  return typeof fieldNode.props.label === "string" && fieldNode.props.label.trim() ? fieldNode.props.label : fieldKey;
}

function toRuntimePayload(data: RecordRuntimeData) {
  return {
    mainData: data.mainData ?? {},
    detailTables: Object.fromEntries(
      Object.entries(data.detailTables ?? {}).map(([detailTableKey, rows]) => [
        detailTableKey,
        (rows ?? []).map((row) => row.values),
      ])
    ),
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
  const detail = await request<RecordDetailResponse>(`/api/records/${recordId}`);
  return {
    ...detail,
    detailTables: Object.fromEntries(
      Object.entries(detail.detailTables ?? {}).map(([detailTableKey, rows]) => [
        detailTableKey,
        normalizeDetailRows(rows),
      ])
    ),
  };
}

export async function listRecordsByForm(formId: number) {
  return request<RecordListItem[]>(`/api/records/by-form/${formId}`);
}

export async function listRelationRecordsByForm(formId: number) {
  return request<RelationRecord[]>(`/api/records/relation/by-form/${formId}`);
}

function matchesFilter(record: RelationRecord, filter: Record<string, unknown>, sourceNodesById?: NodesById) {
  const fieldKey = typeof filter.fieldKey === "string" ? filter.fieldKey : "";
  const operator = typeof filter.operator === "string" ? filter.operator : "eq";
  const expected = filter.value;
  const actual = record.mainData[fieldKey];
  const fieldNode = sourceNodesById ? findFieldNodeByServerId(sourceNodesById, fieldKey) : undefined;

  if (!fieldKey) {
    return true;
  }

  if (operator === "contains") {
    const expectedTexts = normalizeComparableTexts(fieldNode, expected);
    const actualTexts = normalizeComparableTexts(fieldNode, actual);
    return expectedTexts.some((expectedText) => actualTexts.some((actualText) => actualText.includes(expectedText)));
  }

  const expectedTexts = normalizeComparableTexts(fieldNode, expected);
  const actualTexts = normalizeComparableTexts(fieldNode, actual);
  return expectedTexts.some((expectedText) => actualTexts.includes(expectedText));
}

function matchesKeyword(record: RelationRecord, keyword: string, displayFields: string[], sourceNodesById?: NodesById) {
  if (!keyword.trim()) {
    return true;
  }
  const normalized = keyword.trim().toLowerCase();
  const pool = [
    String(record.id),
    ...displayFields.map((fieldKey) => formatRelationDisplayValue(sourceNodesById, fieldKey, record.mainData[fieldKey])),
  ];
  return pool.some((value) => value.toLowerCase().includes(normalized));
}

export async function searchRelationRecords({
  sourceFormId,
  keyword,
  displayFields,
  filters,
  sourceNodesById,
}: {
  sourceFormId: number;
  keyword: string;
  displayFields: string[];
  filters: Array<Record<string, unknown>>;
  sourceNodesById?: NodesById;
}): Promise<RelationSearchResult> {
  try {
    const response = await request<RelationSearchResult>(`/api/records/relation/query/by-form/${sourceFormId}`, {
      method: "POST",
      body: JSON.stringify({
        keyword,
        displayFields,
        filters,
        sorters: [],
        pageNo: 1,
        pageSize: 200,
      }),
    });
    return response;
  } catch {
    const records = await listRelationRecordsByForm(sourceFormId);
    return {
      totalCount: records.length,
      records: records.filter((record) => {
        if (!matchesKeyword(record, keyword, displayFields, sourceNodesById)) {
          return false;
        }
        return filters.every((filter) => matchesFilter(record, filter, sourceNodesById));
      }),
    };
  }
}
