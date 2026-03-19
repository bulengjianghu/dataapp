package com.dataapp.rule.infrastructure.persistence.repository;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.entity.RuleReferenceIndex;
import com.dataapp.rule.domain.model.entity.RuleTriggerBinding;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;
import com.dataapp.rule.domain.repository.InteractionRulePublishPersistence;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.infrastructure.persistence.mapper.InteractionRuleMapper;
import com.dataapp.rule.infrastructure.persistence.po.RuleDefinitionPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftSummaryPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleReferenceIndexPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleTriggerBindingPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleVersionPO;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class InteractionRuleRepositoryImpl implements InteractionRuleRepository {

    private final InteractionRuleMapper interactionRuleMapper;
    private final ObjectMapper objectMapper;

    public InteractionRuleRepositoryImpl(InteractionRuleMapper interactionRuleMapper, ObjectMapper objectMapper) {
        this.interactionRuleMapper = interactionRuleMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public InteractionRuleDefinition findDefinitionById(Long formId, Long ruleId) {
        RuleDefinitionPO po = interactionRuleMapper.selectDefinitionById(formId, ruleId);
        if (po == null) {
            return null;
        }
        return new InteractionRuleDefinition(
            po.getId(),
            po.getFormId(),
            po.getRuleCode(),
            po.getRuleName(),
            po.getEventType(),
            po.getScopeType(),
            po.getStatus(),
            po.getCurrentVersionId(),
            po.getDescription()
        );
    }

    @Override
    public InteractionRuleDraft findDraftByRuleId(Long ruleId) {
        RuleDraftPO po = interactionRuleMapper.selectDraftByRuleId(ruleId);
        if (po == null) {
            return null;
        }
        return new InteractionRuleDraft(
            po.getId(),
            po.getRuleId(),
            po.getDraftJson(),
            po.getGraphJson(),
            po.getCompiledJson(),
            po.getNormalizedJson(),
            po.getVersion(),
            po.getChecksum(),
            po.getCompilerVersion(),
            po.getUpdatedBy(),
            po.getUpdatedAt()
        );
    }

    @Override
    public InteractionRuleVersion findCurrentPublishedVersion(Long formId, Long ruleId) {
        RuleVersionPO po = interactionRuleMapper.selectCurrentPublishedVersion(formId, ruleId);
        if (po == null) {
            return null;
        }
        return new InteractionRuleVersion(
            po.getId(),
            po.getRuleId(),
            po.getVersionNo(),
            po.getRuleType(),
            po.getFormId(),
            po.getFormVersionId(),
            po.getEventType(),
            po.getPriority(),
            readJson(po.getPublishedSnapshotJson()),
            readJson(po.getCompiledJson()),
            readJson(po.getNormalizedJson()),
            readJson(po.getDependencyJson()),
            po.getFailurePolicy(),
            po.getCompilerVersion(),
            po.getPublishedBy(),
            po.getPublishedAt(),
            po.getStatus()
        );
    }

    @Override
    public List<InteractionRuleDraftSummary> listDraftSummariesByFormId(Long formId) {
        return interactionRuleMapper.selectDraftSummariesByFormId(formId).stream()
            .map(this::toSummary)
            .toList();
    }

    @Override
    public Integer nextVersionNo(Long ruleId) {
        Integer current = interactionRuleMapper.selectMaxVersionNo(ruleId);
        return current == null ? 1 : current + 1;
    }

    @Override
    public void saveDefinition(InteractionRuleDefinition definition) {
        interactionRuleMapper.insertDefinition(toDefinitionPO(definition));
    }

    @Override
    public void updateDefinition(InteractionRuleDefinition definition) {
        interactionRuleMapper.updateDefinition(toDefinitionPO(definition));
    }

    @Override
    public void saveDraft(InteractionRuleDraft draft) {
        interactionRuleMapper.upsertDraft(toDraftPO(draft));
    }

    @Override
    public void savePublishedSnapshot(InteractionRulePublishPersistence persistence) {
        interactionRuleMapper.insertVersion(toVersionPO(persistence.version()));
        persistence.triggerBindings().forEach(item -> interactionRuleMapper.insertTriggerBinding(toTriggerBindingPO(item)));
        persistence.referenceIndexes().forEach(item -> interactionRuleMapper.insertReferenceIndex(toReferenceIndexPO(item)));
        interactionRuleMapper.updateCurrentVersion(
            persistence.definition().getFormId(),
            persistence.definition().getId(),
            persistence.version().getId(),
            persistence.definition().getStatus()
        );
    }

    @Override
    public void delete(InteractionRuleDefinition definition) {
        interactionRuleMapper.softDeleteDraftByRuleId(definition.getId());
        interactionRuleMapper.softDeleteDefinition(toDefinitionPO(definition));
    }

    private InteractionRuleDraftSummary toSummary(RuleDraftSummaryPO po) {
        return new InteractionRuleDraftSummary(
            po.getRuleId(),
            po.getRuleCode(),
            po.getRuleName(),
            po.getEventType(),
            po.getDraftJson(),
            po.getStatus(),
            po.getUpdatedAt()
        );
    }

    private RuleDefinitionPO toDefinitionPO(InteractionRuleDefinition definition) {
        RuleDefinitionPO po = new RuleDefinitionPO();
        po.setId(definition.getId());
        po.setFormId(definition.getFormId());
        po.setRuleCode(definition.getRuleCode());
        po.setRuleName(definition.getRuleName());
        po.setEventType(definition.getEventType());
        po.setScopeType(definition.getScopeType());
        po.setStatus(definition.getStatus());
        po.setCurrentVersionId(definition.getCurrentVersionId());
        po.setDescription(definition.getDescription());
        return po;
    }

    private RuleDraftPO toDraftPO(InteractionRuleDraft draft) {
        RuleDraftPO po = new RuleDraftPO();
        po.setId(draft.getId());
        po.setRuleId(draft.getRuleId());
        po.setDraftJson(draft.getDraftJson());
        po.setGraphJson(draft.getGraphJson());
        po.setCompiledJson(draft.getCompiledJson());
        po.setNormalizedJson(draft.getNormalizedJson());
        po.setVersion(draft.getVersion());
        po.setChecksum(draft.getChecksum());
        po.setCompilerVersion(draft.getCompilerVersion());
        po.setUpdatedBy(draft.getUpdatedBy());
        po.setUpdatedAt(draft.getUpdatedAt());
        return po;
    }

    private RuleVersionPO toVersionPO(InteractionRuleVersion version) {
        RuleVersionPO po = new RuleVersionPO();
        po.setId(version.getId());
        po.setRuleId(version.getRuleId());
        po.setVersionNo(version.getVersionNo());
        po.setRuleType(version.getRuleType());
        po.setFormId(version.getFormId());
        po.setFormVersionId(version.getFormVersionId());
        po.setEventType(version.getEventType());
        po.setPriority(version.getPriority());
        po.setPublishedSnapshotJson(writeJson(version.getPublishedSnapshotJson()));
        po.setCompiledJson(writeJson(version.getCompiledJson()));
        po.setNormalizedJson(writeJson(version.getNormalizedJson()));
        po.setDependencyJson(writeJson(version.getDependencyJson()));
        po.setFailurePolicy(writeJson(Map.of("type", version.getFailurePolicy())));
        po.setCompilerVersion(version.getCompilerVersion());
        po.setPublishedBy(version.getPublishedBy());
        po.setPublishedAt(version.getPublishedAt());
        po.setStatus(version.getStatus());
        return po;
    }

    private RuleTriggerBindingPO toTriggerBindingPO(RuleTriggerBinding binding) {
        RuleTriggerBindingPO po = new RuleTriggerBindingPO();
        po.setId(binding.getId());
        po.setRuleVersionId(binding.getRuleVersionId());
        po.setTriggerType(binding.getTriggerType());
        po.setTriggerTarget(binding.getTriggerTarget());
        po.setTriggerScope(binding.getTriggerScope());
        po.setConditionExpr(binding.getConditionExpr());
        po.setSortNo(binding.getSortNo());
        return po;
    }

    private RuleReferenceIndexPO toReferenceIndexPO(RuleReferenceIndex referenceIndex) {
        RuleReferenceIndexPO po = new RuleReferenceIndexPO();
        po.setId(referenceIndex.getId());
        po.setRuleVersionId(referenceIndex.getRuleVersionId());
        po.setRefType(referenceIndex.getRefType());
        po.setRefKey(referenceIndex.getRefKey());
        po.setRefName(referenceIndex.getRefName());
        po.setScopeType(referenceIndex.getScopeType());
        po.setRequired(referenceIndex.isRequired());
        return po;
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则持久化序列化失败");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.RULE_DRAFT_INVALID, "规则持久化反序列化失败");
        }
    }
}
