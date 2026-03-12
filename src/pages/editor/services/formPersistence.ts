import type { Node, NodesById } from "../../../types/schema/node";

const DRAFT_STORAGE_KEY = "dataapp:drafts";
const PUBLISH_STORAGE_KEY = "dataapp:publishes";

type PersistedForm = {
  formId: string;
  publishedAt?: string;
  nodesById: NodesById;
};

function readStorage(key: string): Record<string, PersistedForm> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, PersistedForm>;
  } catch {
    return {};
  }
}

function writeStorage(key: string, value: Record<string, PersistedForm>) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureServerIds(nodesById: NodesById): NodesById {
  return Object.fromEntries(
    Object.entries(nodesById).map(([nodeId, node]) => [
      nodeId,
      {
        ...node,
        serverId: node.serverId ?? `srv_${nodeId}_${Math.random().toString(36).slice(2, 8)}`,
      } satisfies Node,
    ])
  );
}

export async function saveDraftLocally({
  formId,
  nodesById,
}: {
  formId: string | null;
  nodesById: NodesById;
}) {
  const nextFormId = formId ?? `draft_${Date.now()}`;
  const nextNodesById = ensureServerIds(nodesById);
  const drafts = readStorage(DRAFT_STORAGE_KEY);

  drafts[nextFormId] = {
    formId: nextFormId,
    nodesById: nextNodesById,
  };

  writeStorage(DRAFT_STORAGE_KEY, drafts);

  return {
    formId: nextFormId,
    nodesById: nextNodesById,
  };
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

export async function publishFormLocally({
  formId,
  nodesById,
}: {
  formId: string;
  nodesById: NodesById;
}) {
  const publishes = readStorage(PUBLISH_STORAGE_KEY);

  publishes[formId] = {
    formId,
    nodesById,
    publishedAt: new Date().toISOString(),
  };

  writeStorage(PUBLISH_STORAGE_KEY, publishes);

  return publishes[formId];
}
