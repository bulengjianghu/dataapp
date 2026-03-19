package com.dataapp.rule.interfaces.dto;

public record CreateInteractionRuleRequest(
    String ruleName,
    String eventType,
    Integer priority
) {
}
