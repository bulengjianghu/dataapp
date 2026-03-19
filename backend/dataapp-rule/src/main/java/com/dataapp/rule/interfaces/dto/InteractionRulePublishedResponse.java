package com.dataapp.rule.interfaces.dto;

import java.util.Map;

public record InteractionRulePublishedResponse(
    Long formId,
    Long ruleId,
    Long versionId,
    Integer versionNo,
    String eventType,
    Integer priority,
    String compilerVersion,
    String status,
    String publishedAt,
    Map<String, Object> publishedSnapshotJson,
    Map<String, Object> compiledJson,
    Map<String, Object> normalizedJson,
    Map<String, Object> dependencyJson
) {
}
