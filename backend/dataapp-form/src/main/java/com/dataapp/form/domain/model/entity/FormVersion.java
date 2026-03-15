package com.dataapp.form.domain.model.entity;

import java.time.OffsetDateTime;

public final class FormVersion {

    private final Long id;
    private final Long formId;
    private final Integer versionNo;
    private final String fieldsJson;
    private final Long publishedBy;
    private final OffsetDateTime publishedAt;

    public FormVersion(
        Long id,
        Long formId,
        Integer versionNo,
        String fieldsJson,
        Long publishedBy,
        OffsetDateTime publishedAt
    ) {
        this.id = id;
        this.formId = formId;
        this.versionNo = versionNo;
        this.fieldsJson = fieldsJson;
        this.publishedBy = publishedBy;
        this.publishedAt = publishedAt;
    }

    public static FormVersion create(
        Long id,
        Long formId,
        Integer versionNo,
        String fieldsJson,
        Long operatorId,
        OffsetDateTime now
    ) {
        return new FormVersion(id, formId, versionNo, fieldsJson, operatorId, now);
    }

    public Long getId() {
        return id;
    }

    public Long getFormId() {
        return formId;
    }

    public Integer getVersionNo() {
        return versionNo;
    }

    public String getFieldsJson() {
        return fieldsJson;
    }

    public Long getPublishedBy() {
        return publishedBy;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }
}
