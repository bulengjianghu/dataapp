package com.dataapp.rule.domain.model.entity;

public final class RuleReferenceIndex {

    private final Long id;
    private final Long ruleVersionId;
    private final String refType;
    private final String refKey;
    private final String refName;
    private final String scopeType;
    private final boolean required;

    public RuleReferenceIndex(
        Long id,
        Long ruleVersionId,
        String refType,
        String refKey,
        String refName,
        String scopeType,
        boolean required
    ) {
        this.id = id;
        this.ruleVersionId = ruleVersionId;
        this.refType = refType;
        this.refKey = refKey;
        this.refName = refName;
        this.scopeType = scopeType;
        this.required = required;
    }

    public Long getId() {
        return id;
    }

    public Long getRuleVersionId() {
        return ruleVersionId;
    }

    public String getRefType() {
        return refType;
    }

    public String getRefKey() {
        return refKey;
    }

    public String getRefName() {
        return refName;
    }

    public String getScopeType() {
        return scopeType;
    }

    public boolean isRequired() {
        return required;
    }
}
