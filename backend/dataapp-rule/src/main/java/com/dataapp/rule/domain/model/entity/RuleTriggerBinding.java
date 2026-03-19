package com.dataapp.rule.domain.model.entity;

public final class RuleTriggerBinding {

    private final Long id;
    private final Long ruleVersionId;
    private final String triggerType;
    private final String triggerTarget;
    private final String triggerScope;
    private final String conditionExpr;
    private final Integer sortNo;

    public RuleTriggerBinding(
        Long id,
        Long ruleVersionId,
        String triggerType,
        String triggerTarget,
        String triggerScope,
        String conditionExpr,
        Integer sortNo
    ) {
        this.id = id;
        this.ruleVersionId = ruleVersionId;
        this.triggerType = triggerType;
        this.triggerTarget = triggerTarget;
        this.triggerScope = triggerScope;
        this.conditionExpr = conditionExpr;
        this.sortNo = sortNo;
    }

    public Long getId() {
        return id;
    }

    public Long getRuleVersionId() {
        return ruleVersionId;
    }

    public String getTriggerType() {
        return triggerType;
    }

    public String getTriggerTarget() {
        return triggerTarget;
    }

    public String getTriggerScope() {
        return triggerScope;
    }

    public String getConditionExpr() {
        return conditionExpr;
    }

    public Integer getSortNo() {
        return sortNo;
    }
}
