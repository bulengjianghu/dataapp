package com.dataapp.rule.domain.model.entity;

import java.time.OffsetDateTime;
import java.util.Map;

public final class InteractionRuleVersion {

    private final Long id;
    private final Long ruleId;
    private final Integer versionNo;
    private final String ruleType;
    private final Long formId;
    private final Long formVersionId;
    private final String eventType;
    private final Integer priority;
    private final Map<String, Object> publishedSnapshotJson;
    private final Map<String, Object> compiledJson;
    private final Map<String, Object> normalizedJson;
    private final Map<String, Object> dependencyJson;
    private final String failurePolicy;
    private final String compilerVersion;
    private final Long publishedBy;
    private final OffsetDateTime publishedAt;
    private final String status;

    public InteractionRuleVersion(
        Long id,
        Long ruleId,
        Integer versionNo,
        String ruleType,
        Long formId,
        Long formVersionId,
        String eventType,
        Integer priority,
        Map<String, Object> publishedSnapshotJson,
        Map<String, Object> compiledJson,
        Map<String, Object> normalizedJson,
        Map<String, Object> dependencyJson,
        String failurePolicy,
        String compilerVersion,
        Long publishedBy,
        OffsetDateTime publishedAt,
        String status
    ) {
        this.id = id;
        this.ruleId = ruleId;
        this.versionNo = versionNo;
        this.ruleType = ruleType;
        this.formId = formId;
        this.formVersionId = formVersionId;
        this.eventType = eventType;
        this.priority = priority;
        this.publishedSnapshotJson = publishedSnapshotJson;
        this.compiledJson = compiledJson;
        this.normalizedJson = normalizedJson;
        this.dependencyJson = dependencyJson;
        this.failurePolicy = failurePolicy;
        this.compilerVersion = compilerVersion;
        this.publishedBy = publishedBy;
        this.publishedAt = publishedAt;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public Integer getVersionNo() {
        return versionNo;
    }

    public String getRuleType() {
        return ruleType;
    }

    public Long getFormId() {
        return formId;
    }

    public Long getFormVersionId() {
        return formVersionId;
    }

    public String getEventType() {
        return eventType;
    }

    public Integer getPriority() {
        return priority;
    }

    public Map<String, Object> getPublishedSnapshotJson() {
        return publishedSnapshotJson;
    }

    public Map<String, Object> getCompiledJson() {
        return compiledJson;
    }

    public Map<String, Object> getNormalizedJson() {
        return normalizedJson;
    }

    public Map<String, Object> getDependencyJson() {
        return dependencyJson;
    }

    public String getFailurePolicy() {
        return failurePolicy;
    }

    public String getCompilerVersion() {
        return compilerVersion;
    }

    public Long getPublishedBy() {
        return publishedBy;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public String getStatus() {
        return status;
    }
}
