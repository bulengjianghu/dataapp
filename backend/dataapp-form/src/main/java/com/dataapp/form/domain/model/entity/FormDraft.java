package com.dataapp.form.domain.model.entity;

import java.time.OffsetDateTime;

public final class FormDraft {

    private final Long id;
    private final Long formId;
    private final String fieldsJson;
    private final Integer version;
    private final Long updatedBy;
    private final OffsetDateTime updatedAt;

    public FormDraft(
        Long id,
        Long formId,
        String fieldsJson,
        Integer version,
        Long updatedBy,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.formId = formId;
        this.fieldsJson = fieldsJson;
        this.version = version;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public static FormDraft initialize(Long id, Long formId, Long operatorId, OffsetDateTime now) {
        return new FormDraft(id, formId, "{}", 0, operatorId, now);
    }

    public FormDraft save(String nextFieldsJson, Long operatorId, OffsetDateTime now) {
        int nextVersion = version == null ? 1 : version + 1;
        return new FormDraft(id, formId, nextFieldsJson, nextVersion, operatorId, now);
    }

    public FormDraft repersist(String nextFieldsJson, Long operatorId, OffsetDateTime now) {
        return new FormDraft(id, formId, nextFieldsJson, version, operatorId, now);
    }

    public Long getId() {
        return id;
    }

    public Long getFormId() {
        return formId;
    }

    public String getFieldsJson() {
        return fieldsJson;
    }

    public Integer getVersion() {
        return version;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
