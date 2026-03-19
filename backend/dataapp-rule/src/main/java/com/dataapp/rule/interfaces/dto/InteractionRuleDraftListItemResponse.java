package com.dataapp.rule.interfaces.dto;

public record InteractionRuleDraftListItemResponse(
    Long ruleId,
    String ruleCode,
    String ruleName,
    String eventType,
    Integer priority,
    boolean enabled,
    String status,
    String updatedAt
) {
}
