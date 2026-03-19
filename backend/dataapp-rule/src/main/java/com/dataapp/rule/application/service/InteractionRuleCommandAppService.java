package com.dataapp.rule.application.service;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.rule.interfaces.dto.SaveInteractionRuleDraftRequest;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.util.IdGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
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

    private InteractionRuleDefinition requireDefinition(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = interactionRuleRepository.findDefinitionById(formId, ruleId);
        if (definition == null) {
            throw new BizException(ErrorCode.RULE_NOT_FOUND, "规则不存在");
        }
        return definition;
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

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则草稿序列化失败");
        }
    }
}
