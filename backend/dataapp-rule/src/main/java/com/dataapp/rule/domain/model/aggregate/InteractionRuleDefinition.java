package com.dataapp.rule.domain.model.aggregate;

import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.entity.RuleReferenceIndex;
import com.dataapp.rule.domain.model.entity.RuleTriggerBinding;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import com.dataapp.rule.domain.model.valueobject.RuleReferenceSummary;
import com.dataapp.rule.domain.model.valueobject.RuleValidationDiagnostic;
import com.dataapp.rule.domain.model.valueobject.RuleValidationResult;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.kernel.model.AggregateRoot;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.time.OffsetDateTime;

public class InteractionRuleDefinition extends AggregateRoot<Long> {

    private static final String DRAFT_STATUS = "DRAFT";
    private static final String ACTIVE_STATUS = "ACTIVE";
    private static final String DELETED_STATUS = "DELETED";

    private final Long id;
    private final Long formId;
    private final String ruleCode;
    private final String ruleName;
    private final String eventType;
    private final String scopeType;
    private final String status;
    private final Long currentVersionId;
    private final String description;

    public InteractionRuleDefinition(
        Long id,
        Long formId,
        String ruleCode,
        String ruleName,
        String eventType,
        String scopeType,
        String status,
        Long currentVersionId,
        String description
    ) {
        this.id = id;
        this.formId = formId;
        this.ruleCode = ruleCode;
        this.ruleName = ruleName;
        this.eventType = eventType;
        this.scopeType = scopeType;
        this.status = status;
        this.currentVersionId = currentVersionId;
        this.description = description;
    }

    public static InteractionRuleDefinition create(Long id, Long formId, InteractionRuleMeta meta) {
        return new InteractionRuleDefinition(
            id,
            formId,
            "IR-" + id,
            meta.getRuleName(),
            meta.getEventType(),
            meta.getScopeType(),
            DRAFT_STATUS,
            null,
            meta.getDescription()
        );
    }

    @Override
    public Long getId() {
        return id;
    }

    public Long getFormId() {
        return formId;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public String getRuleName() {
        return ruleName;
    }

    public String getEventType() {
        return eventType;
    }

    public String getScopeType() {
        return scopeType;
    }

    public String getStatus() {
        return status;
    }

    public Long getCurrentVersionId() {
        return currentVersionId;
    }

    public String getDescription() {
        return description;
    }

    public DraftSaveResult saveDraft(
        InteractionRuleMeta meta,
        InteractionRuleDraft currentDraft,
        Long nextDraftId,
        String draftJson,
        String graphJson,
        String compiledJson,
        Long operatorId,
        OffsetDateTime now
    ) {
        InteractionRuleDefinition updatedDefinition = new InteractionRuleDefinition(
            id,
            formId,
            ruleCode,
            meta.getRuleName(),
            meta.getEventType(),
            meta.getScopeType(),
            DRAFT_STATUS,
            currentVersionId,
            meta.getDescription()
        );
        InteractionRuleDraft nextDraft = currentDraft == null
            ? InteractionRuleDraft.initialize(
                nextDraftId,
                id,
                draftJson,
                graphJson,
                compiledJson,
                "{}",
                meta.getCompilerVersion(),
                operatorId,
                now
            )
            : currentDraft.save(
                draftJson,
                graphJson,
                compiledJson,
                currentDraft.getNormalizedJson(),
                meta.getCompilerVersion(),
                operatorId,
                now
            );
        return new DraftSaveResult(updatedDefinition, nextDraft);
    }

    public InteractionRuleDefinition delete() {
        return new InteractionRuleDefinition(
            id,
            formId,
            ruleCode,
            ruleName,
            eventType,
            scopeType,
            DELETED_STATUS,
            currentVersionId,
            description
        );
    }

    public RuleValidationResult validateForPublish(
        InteractionRuleMeta meta,
        Map<String, Object> graphPayload,
        Map<String, Object> compiledPayload
    ) {
        List<RuleValidationDiagnostic> diagnostics = new ArrayList<>();
        List<?> graphNodes = readList(graphPayload, "nodes");
        List<?> steps = readList(compiledPayload, "steps");
        RuleReferenceSummary references = readReferences(compiledPayload.get("references"));
        String compiledEventType = readString(compiledPayload, "eventType", meta.getEventType());
        String triggerScope = normalizeTriggerScope(readString(compiledPayload, "triggerScope", meta.resolveTriggerScope()));
        String triggerTarget = readString(compiledPayload, "triggerTarget", "");
        String failurePolicy = normalizeFailurePolicy(readString(compiledPayload, "failurePolicy", "continue"));

        if (graphNodes.isEmpty()) {
            diagnostics.add(RuleValidationDiagnostic.error("graph_empty", "规则图至少需要一个节点"));
        }
        if (steps.isEmpty()) {
            diagnostics.add(RuleValidationDiagnostic.error("compiled_steps_empty", "规则发布前至少需要一个执行步骤"));
        }
        if (!meta.getEventType().equals(compiledEventType)) {
            diagnostics.add(RuleValidationDiagnostic.error("event_type_mismatch", "编译结果中的触发事件与规则元信息不一致"));
        }
        if (requiresTriggerTarget(triggerScope) && triggerTarget.isBlank()) {
            diagnostics.add(RuleValidationDiagnostic.error("trigger_target_missing", "字段触发规则必须指定 triggerTarget"));
        }

        validateGraphStructure(graphPayload, diagnostics);
        validateCompiledStructure(compiledPayload, diagnostics);

        Map<String, Object> normalizedJson = new LinkedHashMap<>();
        normalizedJson.put("ruleId", id);
        normalizedJson.put("ruleCode", ruleCode);
        normalizedJson.put("ruleName", meta.getRuleName());
        normalizedJson.put("eventType", meta.getEventType());
        normalizedJson.put("scopeType", meta.getScopeType());
        normalizedJson.put("priority", meta.getPriority());
        normalizedJson.put("enabled", meta.isEnabled());
        normalizedJson.put("triggerScope", triggerScope);
        if (!triggerTarget.isBlank()) {
            normalizedJson.put("triggerTarget", triggerTarget);
        }
        normalizedJson.put("failurePolicy", failurePolicy);
        normalizedJson.put("steps", steps);
        normalizedJson.put("references", references.toMap());

        Map<String, Object> dependencyJson = new LinkedHashMap<>();
        dependencyJson.put("fieldRefs", references.fields());
        dependencyJson.put("detailTableRefs", references.detailTables());
        dependencyJson.put("formRefs", references.forms());
        dependencyJson.put("eventRefs", references.events());

        return new RuleValidationResult(
            diagnostics.stream().noneMatch(item -> "error".equals(item.level())),
            diagnostics,
            references,
            normalizedJson,
            dependencyJson,
            triggerScope,
            triggerTarget,
            failurePolicy
        );
    }

    public PublishResult publish(
        InteractionRuleMeta meta,
        InteractionRuleDraft draft,
        Map<String, Object> graphPayload,
        Map<String, Object> compiledPayload,
        Integer versionNo,
        Long versionId,
        Long operatorId,
        OffsetDateTime now
    ) {
        if (draft == null) {
            throw new BizException(ErrorCode.RULE_NOT_FOUND, "规则草稿不存在");
        }
        RuleValidationResult validationResult = validateForPublish(meta, graphPayload, compiledPayload);
        if (!validationResult.valid()) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则草稿校验未通过");
        }

        Map<String, Object> publishedSnapshotJson = new LinkedHashMap<>();
        publishedSnapshotJson.put("ruleId", id);
        publishedSnapshotJson.put("ruleCode", ruleCode);
        publishedSnapshotJson.put("ruleName", meta.getRuleName());
        publishedSnapshotJson.put("eventType", meta.getEventType());
        publishedSnapshotJson.put("scopeType", meta.getScopeType());
        publishedSnapshotJson.put("priority", meta.getPriority());
        publishedSnapshotJson.put("description", meta.getDescription());
        publishedSnapshotJson.put("enabled", meta.isEnabled());
        publishedSnapshotJson.put("compilerVersion", meta.getCompilerVersion());
        publishedSnapshotJson.put("graph", graphPayload);
        publishedSnapshotJson.put("compiled", compiledPayload);
        publishedSnapshotJson.put("normalized", validationResult.normalizedJson());
        publishedSnapshotJson.put("dependency", validationResult.dependencyJson());
        publishedSnapshotJson.put("references", validationResult.references().toMap());
        publishedSnapshotJson.put("versionNo", versionNo);

        InteractionRuleDefinition activatedDefinition = new InteractionRuleDefinition(
            id,
            formId,
            ruleCode,
            meta.getRuleName(),
            meta.getEventType(),
            meta.getScopeType(),
            ACTIVE_STATUS,
            versionId,
            meta.getDescription()
        );
        InteractionRuleVersion version = new InteractionRuleVersion(
            versionId,
            id,
            versionNo,
            "INTERACTION",
            formId,
            null,
            meta.getEventType(),
            meta.getPriority(),
            publishedSnapshotJson,
            compiledPayload,
            validationResult.normalizedJson(),
            validationResult.dependencyJson(),
            validationResult.failurePolicy(),
            meta.getCompilerVersion(),
            operatorId,
            now,
            ACTIVE_STATUS
        );
        List<RuleTriggerBinding> triggerBindings = List.of(new RuleTriggerBinding(
            null,
            versionId,
            meta.getEventType(),
            validationResult.triggerTarget(),
            validationResult.triggerScope(),
            null,
            0
        ));
        List<RuleReferenceIndex> referenceIndexes = buildReferenceIndexes(versionId, validationResult.references());
        return new PublishResult(activatedDefinition, version, triggerBindings, referenceIndexes, validationResult);
    }

    private List<RuleReferenceIndex> buildReferenceIndexes(Long versionId, RuleReferenceSummary references) {
        List<RuleReferenceIndex> indexes = new ArrayList<>();
        indexes.add(new RuleReferenceIndex(null, versionId, "FORM", String.valueOf(formId), ruleCode, "FORM", true));
        references.fields().forEach(field ->
            indexes.add(new RuleReferenceIndex(null, versionId, "FORM_FIELD", field, field, "MAIN", true))
        );
        references.detailTables().forEach(table ->
            indexes.add(new RuleReferenceIndex(null, versionId, "DETAIL_TABLE", table, table, "DETAIL", true))
        );
        references.forms().forEach(form ->
            indexes.add(new RuleReferenceIndex(null, versionId, "FORM", form, form, "FORM", true))
        );
        references.events().forEach(event ->
            indexes.add(new RuleReferenceIndex(null, versionId, "EVENT", event, event, "EVENT", false))
        );
        return indexes;
    }

    @SuppressWarnings("unchecked")
    private List<?> readList(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof List<?> list ? list : List.of();
    }

    @SuppressWarnings("unchecked")
    private RuleReferenceSummary readReferences(Object payload) {
        if (!(payload instanceof Map<?, ?> map)) {
            return RuleReferenceSummary.empty();
        }
        return new RuleReferenceSummary(
            readStringList((Map<String, Object>) map, "fields"),
            readStringList((Map<String, Object>) map, "detailTables"),
            readStringList((Map<String, Object>) map, "forms"),
            readStringList((Map<String, Object>) map, "events")
        );
    }

    private List<String> readStringList(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .filter(item -> !item.isBlank())
            .distinct()
            .toList();
    }

    private String readString(Map<String, Object> payload, String key, String defaultValue) {
        Object value = payload.get(key);
        return value instanceof String text && !text.isBlank() ? text.trim() : defaultValue;
    }

    @SuppressWarnings("unchecked")
    private void validateGraphStructure(
        Map<String, Object> graphPayload,
        List<RuleValidationDiagnostic> diagnostics
    ) {
        List<?> rawNodes = readList(graphPayload, "nodes");
        List<?> rawEdges = readList(graphPayload, "edges");

        Map<String, String> nodeTypesById = new HashMap<>();
        rawNodes.stream()
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .forEach(node -> {
                Object id = node.get("id");
                Object type = node.get("type");
                if (id instanceof String nodeId && type instanceof String nodeType && !nodeId.isBlank()) {
                    nodeTypesById.put(nodeId, "condition".equals(nodeType) ? "branch" : nodeType);
                }
            });

        Map<String, List<Map<String, Object>>> outgoingBySource = new HashMap<>();
        Map<String, Integer> incomingCountByTarget = new HashMap<>();
        rawEdges.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .forEach(edge -> {
                Object source = edge.get("source");
                if (source instanceof String sourceId && !sourceId.isBlank()) {
                    outgoingBySource.computeIfAbsent(sourceId, ignored -> new ArrayList<>()).add(edge);
                }
                Object target = edge.get("target");
                if (target instanceof String targetId && !targetId.isBlank()) {
                    incomingCountByTarget.merge(targetId, 1, Integer::sum);
                }
            });

        incomingCountByTarget.forEach((targetId, incomingCount) -> {
            if (incomingCount <= 1) {
                return;
            }
            diagnostics.add(new RuleValidationDiagnostic(
                "node_merge_forbidden_" + targetId,
                "error",
                targetId,
                null,
                "node_merge_forbidden",
                "分流后的链路不允许再次合流到同一个节点。"
            ));
        });

        nodeTypesById.forEach((nodeId, nodeType) -> {
            List<Map<String, Object>> outgoing = outgoingBySource.getOrDefault(nodeId, List.of());
            if (!"branch".equals(nodeType) && outgoing.size() > 1) {
                diagnostics.add(new RuleValidationDiagnostic(
                    "node_multi_outgoing_" + nodeId,
                    "error",
                    nodeId,
                    null,
                    "node_multi_outgoing",
                    "非分流节点只能有一条直接流转边。"
                ));
            }
            if (!"branch".equals(nodeType)) {
                outgoing.forEach(edge -> {
                    String flowType = normalizeFlowType(edge.get("flowType"), edge.get("branch"));
                    if (!"direct".equals(flowType)) {
                        diagnostics.add(new RuleValidationDiagnostic(
                            "node_condition_edge_" + nodeId + "_" + readString(edge, "id", ""),
                            "error",
                            nodeId,
                            readString(edge, "id", ""),
                            "node_condition_edge",
                            "只有分流节点后的连线允许配置为条件流转。"
                        ));
                    }
                });
            }
            if ("branch".equals(nodeType)) {
                outgoing.forEach(edge -> {
                    String flowType = normalizeFlowType(edge.get("flowType"), edge.get("branch"));
                    if (!"condition".equals(flowType)) {
                        return;
                    }
                    List<Map<String, Object>> conditions = readConditionList(edge.get("conditions"));
                    if (conditions.isEmpty()) {
                        diagnostics.add(new RuleValidationDiagnostic(
                            "edge_conditions_missing_" + readString(edge, "id", ""),
                            "warning",
                            nodeId,
                            readString(edge, "id", ""),
                            "edge_conditions_missing",
                            "条件流转边尚未配置命中条件，运行时不会进入该子链。"
                        ));
                    }
                });
            }
        });
    }

    @SuppressWarnings("unchecked")
    private void validateCompiledStructure(
        Map<String, Object> compiledPayload,
        List<RuleValidationDiagnostic> diagnostics
    ) {
        List<?> rawSteps = readList(compiledPayload, "steps");
        Map<String, String> stepTypesById = new HashMap<>();
        rawSteps.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .forEach(step -> {
                String stepId = readString(step, "id", "");
                String stepType = readString(step, "type", "");
                if (!stepId.isBlank() && !stepType.isBlank()) {
                    stepTypesById.put(stepId, "condition".equals(stepType) ? "branch" : stepType);
                }
            });

        Set<String> targetIds = new HashSet<>();
        Map<String, Integer> incomingCountByTarget = new HashMap<>();
        rawSteps.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .forEach(step -> {
                String stepId = readString(step, "id", "");
                String stepType = stepTypesById.getOrDefault(stepId, readString(step, "type", ""));
                List<Map<String, Object>> nextList = readNextList(step.get("next"));

                nextList.stream()
                    .map(next -> next.get("target"))
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .filter(target -> !target.isBlank())
                    .forEach(target -> {
                        targetIds.add(target);
                        incomingCountByTarget.merge(target, 1, Integer::sum);
                    });

                if (!"branch".equals(stepType) && nextList.size() > 1) {
                    diagnostics.add(new RuleValidationDiagnostic(
                        "compiled_node_multi_outgoing_" + stepId,
                        "error",
                        stepId,
                        null,
                        "node_multi_outgoing",
                        "非分流节点只能有一条直接流转边。"
                    ));
                }

                if (!"branch".equals(stepType)) {
                    nextList.forEach(next -> {
                        String flowType = normalizeFlowType(next.get("flowType"), next.get("branch"));
                        if (!"direct".equals(flowType)) {
                            diagnostics.add(new RuleValidationDiagnostic(
                                "compiled_node_condition_edge_" + stepId,
                                "error",
                                stepId,
                                null,
                                "node_condition_edge",
                                "只有分流节点后的连线允许配置为条件流转。"
                            ));
                        }
                    });
                } else {
                    nextList.forEach(next -> {
                        String flowType = normalizeFlowType(next.get("flowType"), next.get("branch"));
                        if (!"condition".equals(flowType)) {
                            return;
                        }
                        List<Map<String, Object>> conditions = readConditionList(next.get("conditions"));
                        if (conditions.isEmpty()) {
                            diagnostics.add(new RuleValidationDiagnostic(
                                "compiled_edge_conditions_missing_" + stepId,
                                "warning",
                                stepId,
                                null,
                                "edge_conditions_missing",
                                "条件流转边尚未配置命中条件，运行时不会进入该子链。"
                            ));
                        }
                    });
                }
            });

        incomingCountByTarget.forEach((targetId, incomingCount) -> {
            if (incomingCount <= 1) {
                return;
            }
            diagnostics.add(new RuleValidationDiagnostic(
                "compiled_node_merge_forbidden_" + targetId,
                "error",
                targetId,
                null,
                "node_merge_forbidden",
                "分流后的链路不允许再次合流到同一个节点。"
            ));
        });

        long entryCount = rawSteps.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .map(step -> readString(step, "id", ""))
            .filter(stepId -> !stepId.isBlank())
            .filter(stepId -> !targetIds.contains(stepId))
            .count();
        if (entryCount > 1) {
            diagnostics.add(RuleValidationDiagnostic.error("compiled_multiple_entry_steps", "执行计划存在多个入口步骤，结构不合法"));
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readNextList(Object payload) {
        if (!(payload instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readConditionList(Object payload) {
        if (!(payload instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .filter(condition -> !readString(condition, "fieldKey", "").isBlank())
            .toList();
    }

    private String normalizeFlowType(Object flowType, Object legacyBranch) {
        if (flowType instanceof String flowText && !flowText.isBlank()) {
            return switch (flowText.trim()) {
                case "direct", "condition" -> flowText.trim();
                default -> "direct";
            };
        }
        if (legacyBranch instanceof String branchText && !branchText.isBlank() && !"success".equals(branchText.trim())) {
            return "condition";
        }
        return "direct";
    }

    private String normalizeTriggerScope(String triggerScope) {
        return switch (triggerScope) {
            case "MAIN_FIELD", "DETAIL_ROW", "RECORD", "GLOBAL" -> triggerScope;
            default -> "GLOBAL";
        };
    }

    private String normalizeFailurePolicy(String failurePolicy) {
        return switch (failurePolicy) {
            case "interrupt", "continue", "fallback" -> failurePolicy;
            default -> "continue";
        };
    }

    private boolean requiresTriggerTarget(String triggerScope) {
        return "MAIN_FIELD".equals(triggerScope) || "DETAIL_ROW".equals(triggerScope);
    }

    public record DraftSaveResult(
        InteractionRuleDefinition definition,
        InteractionRuleDraft draft
    ) {
    }

    public record PublishResult(
        InteractionRuleDefinition definition,
        InteractionRuleVersion version,
        List<RuleTriggerBinding> triggerBindings,
        List<RuleReferenceIndex> referenceIndexes,
        RuleValidationResult validationResult
    ) {
    }
}
