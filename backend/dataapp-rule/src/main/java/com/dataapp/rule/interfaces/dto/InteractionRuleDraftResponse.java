package com.dataapp.rule.interfaces.dto;

import java.util.Map;

public record InteractionRuleDraftResponse(
    Long formId,
    Long ruleId,
    String ruleCode,
    String ruleName,
    String eventType,
    String scopeType,
    Integer priority,
    String description,
    boolean enabled,
    String compilerVersion,
    String status,
    Integer draftVersion,
    Map<String, Object> graphJson,
    Map<String, Object> compiledJson
) {
}
