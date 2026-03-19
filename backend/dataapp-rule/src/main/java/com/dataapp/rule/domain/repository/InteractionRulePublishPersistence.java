package com.dataapp.rule.domain.repository;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.entity.RuleReferenceIndex;
import com.dataapp.rule.domain.model.entity.RuleTriggerBinding;

import java.util.List;

public record InteractionRulePublishPersistence(
    InteractionRuleDefinition definition,
    InteractionRuleVersion version,
    List<RuleTriggerBinding> triggerBindings,
    List<RuleReferenceIndex> referenceIndexes
) {
}
