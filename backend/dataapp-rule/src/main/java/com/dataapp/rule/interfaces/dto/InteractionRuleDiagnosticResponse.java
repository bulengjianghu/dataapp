package com.dataapp.rule.interfaces.dto;

public record InteractionRuleDiagnosticResponse(
    String id,
    String level,
    String nodeId,
    String edgeId,
    String code,
    String message
) {
}
