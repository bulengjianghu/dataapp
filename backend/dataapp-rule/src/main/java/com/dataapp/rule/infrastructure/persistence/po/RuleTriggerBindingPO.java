package com.dataapp.rule.infrastructure.persistence.po;

public class RuleTriggerBindingPO {

    private Long id;
    private Long ruleVersionId;
    private String triggerType;
    private String triggerTarget;
    private String triggerScope;
    private String conditionExpr;
    private Integer sortNo;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRuleVersionId() {
        return ruleVersionId;
    }

    public void setRuleVersionId(Long ruleVersionId) {
        this.ruleVersionId = ruleVersionId;
    }

    public String getTriggerType() {
        return triggerType;
    }

    public void setTriggerType(String triggerType) {
        this.triggerType = triggerType;
    }

    public String getTriggerTarget() {
        return triggerTarget;
    }

    public void setTriggerTarget(String triggerTarget) {
        this.triggerTarget = triggerTarget;
    }

    public String getTriggerScope() {
        return triggerScope;
    }

    public void setTriggerScope(String triggerScope) {
        this.triggerScope = triggerScope;
    }

    public String getConditionExpr() {
        return conditionExpr;
    }

    public void setConditionExpr(String conditionExpr) {
        this.conditionExpr = conditionExpr;
    }

    public Integer getSortNo() {
        return sortNo;
    }

    public void setSortNo(Integer sortNo) {
        this.sortNo = sortNo;
    }
}
