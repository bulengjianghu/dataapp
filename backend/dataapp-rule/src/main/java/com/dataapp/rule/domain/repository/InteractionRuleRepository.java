package com.dataapp.rule.domain.repository;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;

import java.util.List;

public interface InteractionRuleRepository {

    InteractionRuleDefinition findDefinitionById(Long formId, Long ruleId);

    InteractionRuleDraft findDraftByRuleId(Long ruleId);

    InteractionRuleVersion findCurrentPublishedVersion(Long formId, Long ruleId);

    List<InteractionRuleVersion> listPublishedVersionsByFormId(Long formId);

    List<InteractionRuleDraftSummary> listDraftSummariesByFormId(Long formId);

    Integer nextVersionNo(Long ruleId);

    void saveDefinition(InteractionRuleDefinition definition);

    void updateDefinition(InteractionRuleDefinition definition);

    void saveDraft(InteractionRuleDraft draft);

    void savePublishedSnapshot(InteractionRulePublishPersistence persistence);

    void delete(InteractionRuleDefinition definition);
}
