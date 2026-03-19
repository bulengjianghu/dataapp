package com.dataapp.rule.infrastructure.persistence.po;

import java.time.OffsetDateTime;

public class RuleVersionPO {

    private Long id;
    private Long ruleId;
    private Integer versionNo;
    private String ruleType;
    private Long formId;
    private Long formVersionId;
    private String eventType;
    private Integer priority;
    private String publishedSnapshotJson;
    private String compiledJson;
    private String normalizedJson;
    private String dependencyJson;
    private String failurePolicy;
    private String compilerVersion;
    private Long publishedBy;
    private OffsetDateTime publishedAt;
    private String status;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public void setRuleId(Long ruleId) {
        this.ruleId = ruleId;
    }

    public Integer getVersionNo() {
        return versionNo;
    }

    public void setVersionNo(Integer versionNo) {
        this.versionNo = versionNo;
    }

    public String getRuleType() {
        return ruleType;
    }

    public void setRuleType(String ruleType) {
        this.ruleType = ruleType;
    }

    public Long getFormId() {
        return formId;
    }

    public void setFormId(Long formId) {
        this.formId = formId;
    }

    public Long getFormVersionId() {
        return formVersionId;
    }

    public void setFormVersionId(Long formVersionId) {
        this.formVersionId = formVersionId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getPublishedSnapshotJson() {
        return publishedSnapshotJson;
    }

    public void setPublishedSnapshotJson(String publishedSnapshotJson) {
        this.publishedSnapshotJson = publishedSnapshotJson;
    }

    public String getCompiledJson() {
        return compiledJson;
    }

    public void setCompiledJson(String compiledJson) {
        this.compiledJson = compiledJson;
    }

    public String getNormalizedJson() {
        return normalizedJson;
    }

    public void setNormalizedJson(String normalizedJson) {
        this.normalizedJson = normalizedJson;
    }

    public String getDependencyJson() {
        return dependencyJson;
    }

    public void setDependencyJson(String dependencyJson) {
        this.dependencyJson = dependencyJson;
    }

    public String getFailurePolicy() {
        return failurePolicy;
    }

    public void setFailurePolicy(String failurePolicy) {
        this.failurePolicy = failurePolicy;
    }

    public String getCompilerVersion() {
        return compilerVersion;
    }

    public void setCompilerVersion(String compilerVersion) {
        this.compilerVersion = compilerVersion;
    }

    public Long getPublishedBy() {
        return publishedBy;
    }

    public void setPublishedBy(Long publishedBy) {
        this.publishedBy = publishedBy;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(OffsetDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
