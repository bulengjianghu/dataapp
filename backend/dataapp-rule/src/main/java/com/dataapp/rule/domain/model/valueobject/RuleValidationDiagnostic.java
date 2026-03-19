package com.dataapp.rule.domain.model.valueobject;

public record RuleValidationDiagnostic(
    String id,
    String level,
    String nodeId,
    String edgeId,
    String code,
    String message
) {

    public static RuleValidationDiagnostic error(String code, String message) {
        return new RuleValidationDiagnostic(code, "error", null, null, code, message);
    }
}
