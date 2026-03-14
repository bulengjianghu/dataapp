package com.dataapp.form.infrastructure.persistence.po;

import java.time.OffsetDateTime;

public class FormVersionPO {

    private Long id;
    private Long formId;
    private Integer versionNo;
    private String fieldsJson;
    private Long publishedBy;
    private OffsetDateTime publishedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getFormId() {
        return formId;
    }

    public void setFormId(Long formId) {
        this.formId = formId;
    }

    public Integer getVersionNo() {
        return versionNo;
    }

    public void setVersionNo(Integer versionNo) {
        this.versionNo = versionNo;
    }

    public String getFieldsJson() {
        return fieldsJson;
    }

    public void setFieldsJson(String fieldsJson) {
        this.fieldsJson = fieldsJson;
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
}
