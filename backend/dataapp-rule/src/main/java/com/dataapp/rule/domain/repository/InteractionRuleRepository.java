package com.dataapp.rule.domain.repository;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;

import java.util.List;

public interface InteractionRuleRepository {

    InteractionRuleDefinition findDefinitionById(Long formId, Long ruleId);

    InteractionRuleDraft findDraftByRuleId(Long ruleId);

    List<InteractionRuleDraftSummary> listDraftSummariesByFormId(Long formId);

    void saveDefinition(InteractionRuleDefinition definition);

    void updateDefinition(InteractionRuleDefinition definition);

    void saveDraft(InteractionRuleDraft draft);
}
