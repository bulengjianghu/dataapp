package com.dataapp.rule.domain.model.valueobject;

import java.time.OffsetDateTime;

public record InteractionRuleDraftSummary(
    Long ruleId,
    String ruleCode,
    String ruleName,
    String eventType,
    String draftJson,
    String status,
    OffsetDateTime updatedAt
) {
}
