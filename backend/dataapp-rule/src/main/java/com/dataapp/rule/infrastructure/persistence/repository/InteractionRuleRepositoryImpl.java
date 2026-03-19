package com.dataapp.rule.infrastructure.persistence.repository;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.infrastructure.persistence.mapper.InteractionRuleMapper;
import com.dataapp.rule.infrastructure.persistence.po.RuleDefinitionPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftSummaryPO;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class InteractionRuleRepositoryImpl implements InteractionRuleRepository {

    private final InteractionRuleMapper interactionRuleMapper;

    public InteractionRuleRepositoryImpl(InteractionRuleMapper interactionRuleMapper) {
        this.interactionRuleMapper = interactionRuleMapper;
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
    public List<InteractionRuleDraftSummary> listDraftSummariesByFormId(Long formId) {
        return interactionRuleMapper.selectDraftSummariesByFormId(formId).stream()
            .map(this::toSummary)
            .toList();
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
}
