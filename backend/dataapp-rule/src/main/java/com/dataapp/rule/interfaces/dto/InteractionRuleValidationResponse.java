package com.dataapp.rule.interfaces.dto;

import java.util.List;
import java.util.Map;

public record InteractionRuleValidationResponse(
    Long formId,
    Long ruleId,
    boolean valid,
    List<InteractionRuleDiagnosticResponse> diagnostics,
    InteractionRuleReferenceSummaryResponse references,
    Map<String, Object> normalizedJson,
    Map<String, Object> dependencyJson
) {
}
