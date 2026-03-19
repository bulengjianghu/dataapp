package com.dataapp.rule.domain.model.aggregate;

import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import com.dataapp.shared.kernel.model.AggregateRoot;

import java.time.OffsetDateTime;

public class InteractionRuleDefinition extends AggregateRoot<Long> {

    private static final String DRAFT_STATUS = "DRAFT";

    private final Long id;
    private final Long formId;
    private final String ruleCode;
    private final String ruleName;
    private final String eventType;
    private final String scopeType;
    private final String status;
    private final String description;

    public InteractionRuleDefinition(
        Long id,
        Long formId,
        String ruleCode,
        String ruleName,
        String eventType,
        String scopeType,
        String status,
        String description
    ) {
        this.id = id;
        this.formId = formId;
        this.ruleCode = ruleCode;
        this.ruleName = ruleName;
        this.eventType = eventType;
        this.scopeType = scopeType;
        this.status = status;
        this.description = description;
    }

    public static InteractionRuleDefinition create(Long id, Long formId, InteractionRuleMeta meta) {
        return new InteractionRuleDefinition(
            id,
            formId,
            "IR-" + id,
            meta.getRuleName(),
            meta.getEventType(),
            meta.getScopeType(),
            DRAFT_STATUS,
            meta.getDescription()
        );
    }

    @Override
    public Long getId() {
        return id;
    }

    public Long getFormId() {
        return formId;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public String getRuleName() {
        return ruleName;
    }

    public String getEventType() {
        return eventType;
    }

    public String getScopeType() {
        return scopeType;
    }

    public String getStatus() {
        return status;
    }

    public String getDescription() {
        return description;
    }

    public DraftSaveResult saveDraft(
        InteractionRuleMeta meta,
        InteractionRuleDraft currentDraft,
        Long nextDraftId,
        String draftJson,
        String graphJson,
        String compiledJson,
        Long operatorId,
        OffsetDateTime now
    ) {
        InteractionRuleDefinition updatedDefinition = new InteractionRuleDefinition(
            id,
            formId,
            ruleCode,
            meta.getRuleName(),
            meta.getEventType(),
            meta.getScopeType(),
            DRAFT_STATUS,
            meta.getDescription()
        );
        InteractionRuleDraft nextDraft = currentDraft == null
            ? InteractionRuleDraft.initialize(
                nextDraftId,
                id,
                draftJson,
                graphJson,
                compiledJson,
                "{}",
                meta.getCompilerVersion(),
                operatorId,
                now
            )
            : currentDraft.save(
                draftJson,
                graphJson,
                compiledJson,
                currentDraft.getNormalizedJson(),
                meta.getCompilerVersion(),
                operatorId,
                now
            );
        return new DraftSaveResult(updatedDefinition, nextDraft);
    }

    public record DraftSaveResult(
        InteractionRuleDefinition definition,
        InteractionRuleDraft draft
    ) {
    }
}
