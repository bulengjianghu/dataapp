package com.dataapp.rule.interfaces.dto;

import java.util.Map;

public record InteractionRuntimeRuleResponse(
    Long ruleId,
    Long versionId,
    Integer versionNo,
    String ruleCode,
    String ruleName,
    String eventType,
    Integer priority,
    String triggerScope,
    String triggerTarget,
    String failurePolicy,
    String compilerVersion,
    Map<String, Object> normalizedJson
) {
}
