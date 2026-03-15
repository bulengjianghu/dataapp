package com.dataapp.form.infrastructure.persistence.po;

import java.time.OffsetDateTime;

public class FormDraftSummaryPO {

    private Long formId;
    private String formCode;
    private String name;
    private String description;
    private String status;
    private Integer draftVersion;
    private OffsetDateTime updatedAt;

    public Long getFormId() {
        return formId;
    }

    public void setFormId(Long formId) {
        this.formId = formId;
    }

    public String getFormCode() {
        return formCode;
    }

    public void setFormCode(String formCode) {
        this.formCode = formCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getDraftVersion() {
        return draftVersion;
    }

    public void setDraftVersion(Integer draftVersion) {
        this.draftVersion = draftVersion;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
