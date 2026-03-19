package com.dataapp.rule.application.service;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.entity.RuleReferenceIndex;
import com.dataapp.rule.domain.model.entity.RuleTriggerBinding;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import com.dataapp.rule.domain.model.valueobject.RuleReferenceSummary;
import com.dataapp.rule.domain.model.valueobject.RuleValidationDiagnostic;
import com.dataapp.rule.domain.model.valueobject.RuleValidationResult;
import com.dataapp.rule.domain.repository.InteractionRulePublishPersistence;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.interfaces.dto.InteractionRuleDiagnosticResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.rule.interfaces.dto.InteractionRulePublishResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleReferenceSummaryResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleValidationResponse;
import com.dataapp.rule.interfaces.dto.SaveInteractionRuleDraftRequest;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.util.IdGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InteractionRuleCommandAppService {

    private static final Long DEFAULT_OPERATOR_ID = 1L;
    private static final String EMPTY_JSON = "{}";

    private final InteractionRuleRepository interactionRuleRepository;
    private final ObjectMapper objectMapper;

    public InteractionRuleCommandAppService(
        InteractionRuleRepository interactionRuleRepository,
        ObjectMapper objectMapper
    ) {
        this.interactionRuleRepository = interactionRuleRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public InteractionRuleDraftResponse create(Long formId, String ruleName, String eventType, Integer priority) {
        long ruleId = IdGenerator.nextId();
        InteractionRuleMeta meta = InteractionRuleMeta.initialize(ruleName, eventType, priority);
        InteractionRuleDefinition definition = InteractionRuleDefinition.create(ruleId, formId, meta);
        InteractionRuleDefinition.DraftSaveResult result = definition.saveDraft(
            meta,
            null,
            IdGenerator.nextId(),
            writeJson(meta.toDraftSnapshot(definition.getRuleCode())),
            EMPTY_JSON,
            EMPTY_JSON,
            DEFAULT_OPERATOR_ID,
            OffsetDateTime.now()
        );
        interactionRuleRepository.saveDefinition(result.definition());
        interactionRuleRepository.saveDraft(result.draft());
        return toResponse(formId, result.definition(), meta, result.draft(), Map.of(), Map.of());
    }

    @Transactional
    public InteractionRuleDraftResponse saveDraft(
        Long formId,
        Long ruleId,
        SaveInteractionRuleDraftRequest request
    ) {
        InteractionRuleDefinition definition = requireDefinition(formId, ruleId);
        InteractionRuleDraft currentDraft = interactionRuleRepository.findDraftByRuleId(ruleId);
        InteractionRuleMeta meta = InteractionRuleMeta.reconstruct(
            request.ruleName(),
            request.eventType(),
            request.scopeType(),
            request.priority(),
            request.description(),
            request.enabled(),
            request.compilerVersion()
        );
        InteractionRuleDefinition.DraftSaveResult result = definition.saveDraft(
            meta,
            currentDraft,
            IdGenerator.nextId(),
            writeJson(meta.toDraftSnapshot(definition.getRuleCode())),
            writeJson(request.graphJson()),
            writeJson(request.compiledJson()),
            DEFAULT_OPERATOR_ID,
            OffsetDateTime.now()
        );
        interactionRuleRepository.updateDefinition(result.definition());
        interactionRuleRepository.saveDraft(result.draft());
        return toResponse(formId, result.definition(), meta, result.draft(), request.graphJson(), request.compiledJson());
    }

    public InteractionRuleValidationResponse validate(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = requireDefinition(formId, ruleId);
        InteractionRuleDraft draft = requireDraft(ruleId);
        InteractionRuleMeta meta = resolveMeta(definition, readJson(draft.getDraftJson()));
        RuleValidationResult validationResult = definition.validateForPublish(
            meta,
            readJson(draft.getGraphJson()),
            readJson(draft.getCompiledJson())
        );
        return toValidationResponse(formId, ruleId, validationResult);
    }

    @Transactional
    public InteractionRulePublishResponse publish(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = requireDefinition(formId, ruleId);
        InteractionRuleDraft draft = requireDraft(ruleId);
        InteractionRuleMeta meta = resolveMeta(definition, readJson(draft.getDraftJson()));
        Map<String, Object> graphJson = readJson(draft.getGraphJson());
        Map<String, Object> compiledJson = readJson(draft.getCompiledJson());
        int versionNo = interactionRuleRepository.nextVersionNo(ruleId);
        long versionId = IdGenerator.nextId();

        InteractionRuleDefinition.PublishResult result = definition.publish(
            meta,
            draft,
            graphJson,
            compiledJson,
            versionNo,
            versionId,
            DEFAULT_OPERATOR_ID,
            OffsetDateTime.now()
        );

        interactionRuleRepository.savePublishedSnapshot(new InteractionRulePublishPersistence(
            result.definition(),
            result.version(),
            assignBindingIds(result.triggerBindings()),
            assignReferenceIds(result.referenceIndexes())
        ));
        return new InteractionRulePublishResponse(
            formId,
            ruleId,
            versionId,
            versionNo,
            result.definition().getStatus(),
            toReferenceSummaryResponse(result.validationResult().references()),
            result.validationResult().normalizedJson()
        );
    }

    @Transactional
    public void delete(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = requireDefinition(formId, ruleId);
        interactionRuleRepository.delete(definition.delete());
    }

    private InteractionRuleDefinition requireDefinition(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = interactionRuleRepository.findDefinitionById(formId, ruleId);
        if (definition == null) {
            throw new BizException(ErrorCode.RULE_NOT_FOUND, "规则不存在");
        }
        return definition;
    }

    private InteractionRuleDraft requireDraft(Long ruleId) {
        InteractionRuleDraft draft = interactionRuleRepository.findDraftByRuleId(ruleId);
        if (draft == null) {
            throw new BizException(ErrorCode.RULE_NOT_FOUND, "规则草稿不存在");
        }
        return draft;
    }

    private InteractionRuleDraftResponse toResponse(
        Long formId,
        InteractionRuleDefinition definition,
        InteractionRuleMeta meta,
        InteractionRuleDraft draft,
        Map<String, Object> graphJson,
        Map<String, Object> compiledJson
    ) {
        return new InteractionRuleDraftResponse(
            formId,
            definition.getId(),
            definition.getRuleCode(),
            definition.getRuleName(),
            definition.getEventType(),
            definition.getScopeType(),
            meta.getPriority(),
            definition.getDescription(),
            meta.isEnabled(),
            meta.getCompilerVersion(),
            definition.getStatus(),
            draft.getVersion(),
            graphJson,
            compiledJson
        );
    }

    private InteractionRuleValidationResponse toValidationResponse(
        Long formId,
        Long ruleId,
        RuleValidationResult validationResult
    ) {
        return new InteractionRuleValidationResponse(
            formId,
            ruleId,
            validationResult.valid(),
            validationResult.diagnostics().stream()
                .map(this::toDiagnosticResponse)
                .toList(),
            toReferenceSummaryResponse(validationResult.references()),
            validationResult.normalizedJson(),
            validationResult.dependencyJson()
        );
    }

    private InteractionRuleDiagnosticResponse toDiagnosticResponse(RuleValidationDiagnostic diagnostic) {
        return new InteractionRuleDiagnosticResponse(
            diagnostic.id(),
            diagnostic.level(),
            diagnostic.nodeId(),
            diagnostic.edgeId(),
            diagnostic.code(),
            diagnostic.message()
        );
    }

    private InteractionRuleReferenceSummaryResponse toReferenceSummaryResponse(RuleReferenceSummary references) {
        return new InteractionRuleReferenceSummaryResponse(
            references.fields(),
            references.detailTables(),
            references.forms(),
            references.events()
        );
    }

    private InteractionRuleMeta resolveMeta(InteractionRuleDefinition definition, Map<String, Object> metaPayload) {
        return InteractionRuleMeta.reconstruct(
            readString(metaPayload, "ruleName", definition.getRuleName()),
            readString(metaPayload, "eventType", definition.getEventType()),
            readString(metaPayload, "scopeType", definition.getScopeType()),
            readInteger(metaPayload, "priority", InteractionRuleMeta.DEFAULT_PRIORITY),
            readString(metaPayload, "description", definition.getDescription()),
            readBoolean(metaPayload, "enabled", true),
            readString(metaPayload, "compilerVersion", "")
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则草稿反序列化失败");
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则草稿序列化失败");
        }
    }

    private List<RuleTriggerBinding> assignBindingIds(List<RuleTriggerBinding> bindings) {
        return bindings.stream()
            .map(item -> new RuleTriggerBinding(
                IdGenerator.nextId(),
                item.getRuleVersionId(),
                item.getTriggerType(),
                item.getTriggerTarget(),
                item.getTriggerScope(),
                item.getConditionExpr(),
                item.getSortNo()
            ))
            .toList();
    }

    private List<RuleReferenceIndex> assignReferenceIds(List<RuleReferenceIndex> references) {
        return references.stream()
            .map(item -> new RuleReferenceIndex(
                IdGenerator.nextId(),
                item.getRuleVersionId(),
                item.getRefType(),
                item.getRefKey(),
                item.getRefName(),
                item.getScopeType(),
                item.isRequired()
            ))
            .toList();
    }

    private String readString(Map<String, Object> payload, String key, String defaultValue) {
        Object value = payload.get(key);
        return value instanceof String text && !text.isBlank() ? text : defaultValue;
    }

    private Integer readInteger(Map<String, Object> payload, String key, Integer defaultValue) {
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return defaultValue;
    }

    private boolean readBoolean(Map<String, Object> payload, String key, boolean defaultValue) {
        Object value = payload.get(key);
        return value instanceof Boolean bool ? bool : defaultValue;
    }
}
