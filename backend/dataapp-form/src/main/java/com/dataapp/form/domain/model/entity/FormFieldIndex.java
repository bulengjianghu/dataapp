package com.dataapp.form.domain.model.entity;

public record FormFieldIndex(
    String fieldKey,
    String fieldCode,
    String fieldName,
    String nodeType,
    String componentType,
    String parentFieldKey,
    Integer sortNo
) {
}
