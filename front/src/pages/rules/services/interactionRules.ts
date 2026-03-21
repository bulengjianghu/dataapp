import { request } from "../../../services/api";
import {
  type CompiledInteractionRule,
  type InteractionEventType,
  type InteractionRuleMeta,
  type RuleReferenceSummary,
  deserializeCompiledInteractionRule,
  serializeCompiledInteractionRule,
} from "../../../store/slices/interactionRuleDraftSlice";
import { isInteractionEventType } from "./interactionRuleEvents";

export type InteractionRuleSummary = {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  eventType: InteractionEventType;
  priority: number;
  enabled: boolean;
  status: string;
  updatedAt: string;
};

type InteractionRuleSummaryResponse = {
  ruleId: number;
  ruleCode: string;
  ruleName: string;
  eventType: InteractionEventType;
  priority: number;
  enabled: boolean;
  status: string;
  updatedAt: string;
};

type InteractionRuleDraftResponse = {
  formId: number;
  ruleId: number;
  ruleCode: string;
  ruleName: string;
  eventType: InteractionEventType;
  scopeType: "FORM" | "FORM_VERSION";
  priority: number;
  description: string;
  enabled: boolean;
  compilerVersion: string;
  status: string;
  draftVersion: number;
  graphJson: Record<string, unknown>;
  compiledJson: Record<string, unknown>;
};

type InteractionRuleValidationResponse = {
  valid: boolean;
  diagnostics: Array<{
    id: string;
    level: "error" | "warning";
    nodeId?: string;
    edgeId?: string;
    code: string;
    message: string;
  }>;
  references: RuleReferenceSummary;
  normalizedJson: Record<string, unknown>;
  dependencyJson: Record<string, unknown>;
};

type InteractionRulePublishResponse = {
  versionId: number;
  versionNo: number;
  status: string;
  references: RuleReferenceSummary;
  normalizedJson: Record<string, unknown>;
};

type InteractionRulePublishedResponse = {
  versionId: number;
  versionNo: number;
  eventType: InteractionEventType;
  priority: number;
  compilerVersion: string;
  status: string;
  publishedAt: string;
  publishedSnapshotJson: Record<string, unknown>;
  compiledJson: Record<string, unknown>;
  normalizedJson: Record<string, unknown>;
  dependencyJson: Record<string, unknown>;
};

export type InteractionRuleDraft = {
  meta: InteractionRuleMeta;
  graphJson: Record<string, unknown>;
  compiledRule?: CompiledInteractionRule | null;
};

export type InteractionRuleValidationResult = InteractionRuleValidationResponse;

export type InteractionRulePublishResult = {
  versionId: string;
  versionNo: number;
  status: string;
  references: RuleReferenceSummary;
  normalizedJson: Record<string, unknown>;
};

export type InteractionRulePublishedVersion = {
  versionId: string;
  versionNo: number;
  eventType: InteractionEventType;
  priority: number;
  compilerVersion: string;
  status: string;
  publishedAt: string;
  publishedSnapshotJson: Record<string, unknown>;
  compiledJson: Record<string, unknown>;
  normalizedJson: Record<string, unknown>;
  dependencyJson: Record<string, unknown>;
};

function deserializeDraft(payload: InteractionRuleDraftResponse): InteractionRuleDraft {
  return {
    meta: {
      formId: String(payload.formId),
      ruleId: String(payload.ruleId),
      ruleCode: payload.ruleCode,
      ruleName: payload.ruleName,
      eventType: payload.eventType,
      scopeType: payload.scopeType,
      priority: payload.priority,
      description: payload.description,
      enabled: payload.enabled,
      compilerVersion: payload.compilerVersion,
      status: payload.status,
      draftVersion: payload.draftVersion,
    },
    graphJson: payload.graphJson ?? {},
    compiledRule: deserializeCompiledInteractionRule(String(payload.ruleId), payload.compiledJson ?? {}),
  };
}

function readTriggerEventTypeFromGraph(graphJson: Record<string, unknown> | undefined) {
  const nodes = Array.isArray(graphJson?.nodes) ? graphJson.nodes : [];
  for (const item of nodes) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const node = item as { type?: unknown; data?: Record<string, unknown> };
    if (node.type !== "trigger") {
      continue;
    }
    const eventType = node.data?.eventType;
    if (isInteractionEventType(eventType)) {
      return eventType;
    }
  }
  return null;
}

export async function listInteractionRulesOnServer(formId: string): Promise<InteractionRuleSummary[]> {
  const items = await request<InteractionRuleSummaryResponse[]>(`/api/admin/forms/${formId}/interaction-rules`);
  return items.map((item) => ({
    ...item,
    ruleId: String(item.ruleId),
  }));
}

export async function createInteractionRuleOnServer(formId: string) {
  const created = await request<InteractionRuleDraftResponse>(`/api/admin/forms/${formId}/interaction-rules`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return deserializeDraft(created);
}

export async function deleteInteractionRuleOnServer(formId: string, ruleId: string) {
  await request<void>(`/api/admin/forms/${formId}/interaction-rules/${ruleId}`, {
    method: "DELETE",
  });
}

export async function loadInteractionRuleDraftFromServer(formId: string, ruleId: string) {
  const draft = await request<InteractionRuleDraftResponse>(
    `/api/admin/forms/${formId}/interaction-rules/${ruleId}/draft`
  );
  return deserializeDraft(draft);
}

export async function saveInteractionRuleDraftToServer(
  draft: InteractionRuleDraft,
  options?: { keepalive?: boolean }
) {
  if (!draft.meta.formId || !draft.meta.ruleId) {
    throw new Error("规则草稿尚未初始化");
  }

  const derivedEventType =
    draft.compiledRule?.eventType ??
    readTriggerEventTypeFromGraph(draft.graphJson) ??
    draft.meta.eventType;

  const saved = await request<InteractionRuleDraftResponse>(
    `/api/admin/forms/${draft.meta.formId}/interaction-rules/${draft.meta.ruleId}/draft`,
    {
      method: "PUT",
      keepalive: options?.keepalive,
      body: JSON.stringify({
        ruleCode: draft.meta.ruleCode,
        ruleName: draft.meta.ruleName,
        eventType: derivedEventType,
        scopeType: draft.meta.scopeType,
        priority: draft.meta.priority,
        description: draft.meta.description,
        enabled: draft.meta.enabled,
        compilerVersion: draft.meta.compilerVersion,
        graphJson: draft.graphJson,
        compiledJson: serializeCompiledInteractionRule(draft.compiledRule ?? null),
      }),
    }
  );

  return deserializeDraft(saved);
}

export async function validateInteractionRuleOnServer(formId: string, ruleId: string) {
  return request<InteractionRuleValidationResponse>(
    `/api/admin/forms/${formId}/interaction-rules/${ruleId}/validate`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export async function publishInteractionRuleOnServer(
  formId: string,
  ruleId: string
): Promise<InteractionRulePublishResult> {
  const published = await request<InteractionRulePublishResponse>(
    `/api/admin/forms/${formId}/interaction-rules/${ruleId}/publish`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
  return {
    versionId: String(published.versionId),
    versionNo: published.versionNo,
    status: published.status,
    references: published.references,
    normalizedJson: published.normalizedJson,
  };
}

export async function loadPublishedInteractionRuleFromServer(
  formId: string,
  ruleId: string
): Promise<InteractionRulePublishedVersion> {
  const published = await request<InteractionRulePublishedResponse>(
    `/api/admin/forms/${formId}/interaction-rules/${ruleId}/published`
  );
  return {
    versionId: String(published.versionId),
    versionNo: published.versionNo,
    eventType: published.eventType,
    priority: published.priority,
    compilerVersion: published.compilerVersion,
    status: published.status,
    publishedAt: published.publishedAt,
    publishedSnapshotJson: published.publishedSnapshotJson ?? {},
    compiledJson: published.compiledJson ?? {},
    normalizedJson: published.normalizedJson ?? {},
    dependencyJson: published.dependencyJson ?? {},
  };
}
