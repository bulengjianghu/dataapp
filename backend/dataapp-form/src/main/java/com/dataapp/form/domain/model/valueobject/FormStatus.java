package com.dataapp.form.domain.model.valueobject;

public enum FormStatus {
    DRAFT,
    ACTIVE,
    DELETED;

    public String code() {
        return name();
    }
}
