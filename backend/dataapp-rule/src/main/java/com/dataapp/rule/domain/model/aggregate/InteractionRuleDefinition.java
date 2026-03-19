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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
