package com.dataapp.rule.interfaces.dto;

import java.util.Map;

public record InteractionRulePublishResponse(
    Long formId,
    Long ruleId,
    Long versionId,
    Integer versionNo,
    String status,
    InteractionRuleReferenceSummaryResponse references,
    Map<String, Object> normalizedJson
) {
}
