package com.dataapp.rule.application.service;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftListItemResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InteractionRuleQueryAppService {

    private final InteractionRuleRepository interactionRuleRepository;
    private final ObjectMapper objectMapper;

    public InteractionRuleQueryAppService(
        InteractionRuleRepository interactionRuleRepository,
        ObjectMapper objectMapper
    ) {
        this.interactionRuleRepository = interactionRuleRepository;
        this.objectMapper = objectMapper;
    }

    public List<InteractionRuleDraftListItemResponse> listDrafts(Long formId) {
        return interactionRuleRepository.listDraftSummariesByFormId(formId).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    public InteractionRuleDraftResponse getDraft(Long formId, Long ruleId) {
        InteractionRuleDefinition definition = interactionRuleRepository.findDefinitionById(formId, ruleId);
        InteractionRuleDraft draft = interactionRuleRepository.findDraftByRuleId(ruleId);
        if (definition == null || draft == null) {
            throw new BizException(ErrorCode.RULE_NOT_FOUND, "规则草稿不存在");
        }

        Map<String, Object> meta = readJson(draft.getDraftJson());

        return new InteractionRuleDraftResponse(
            formId,
            ruleId,
            readString(meta, "ruleCode", definition.getRuleCode()),
            readString(meta, "ruleName", definition.getRuleName()),
            readString(meta, "eventType", definition.getEventType()),
            readString(meta, "scopeType", definition.getScopeType()),
            readInteger(meta, "priority", 100),
            readString(meta, "description", definition.getDescription()),
            readBoolean(meta, "enabled", true),
            readString(meta, "compilerVersion", draft.getCompilerVersion()),
            definition.getStatus(),
            draft.getVersion(),
            readJson(draft.getGraphJson()),
            readJson(draft.getCompiledJson())
        );
    }

    private InteractionRuleDraftListItemResponse toSummaryResponse(InteractionRuleDraftSummary item) {
        Map<String, Object> meta = readJson(item.draftJson());
        return new InteractionRuleDraftListItemResponse(
            item.ruleId(),
            item.ruleCode(),
            item.ruleName(),
            item.eventType(),
            readInteger(meta, "priority", 100),
            readBoolean(meta, "enabled", true),
            item.status(),
            item.updatedAt() == null ? "" : item.updatedAt().toString()
        );
    }

    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则草稿反序列化失败");
        }
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
