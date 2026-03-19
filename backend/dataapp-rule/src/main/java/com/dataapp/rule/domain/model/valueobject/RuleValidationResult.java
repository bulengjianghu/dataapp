package com.dataapp.rule.domain.model.valueobject;

import java.util.List;
import java.util.Map;

public record RuleValidationResult(
    boolean valid,
    List<RuleValidationDiagnostic> diagnostics,
    RuleReferenceSummary references,
    Map<String, Object> normalizedJson,
    Map<String, Object> dependencyJson,
    String triggerScope,
    String triggerTarget,
    String failurePolicy
) {
}
