package com.dataapp.rule.interfaces.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SaveInteractionRuleDraftRequest(
    @NotBlank String ruleCode,
    @NotBlank String ruleName,
    @NotBlank String eventType,
    @NotBlank String scopeType,
    @NotNull Integer priority,
    String description,
    boolean enabled,
    String compilerVersion,
    @NotNull Map<String, Object> graphJson,
    @NotNull Map<String, Object> compiledJson
) {
}
