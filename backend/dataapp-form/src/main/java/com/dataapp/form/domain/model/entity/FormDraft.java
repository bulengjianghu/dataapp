package com.dataapp.form.domain.model.entity;

import java.time.OffsetDateTime;

public record FormDraft(
    Long id,
    Long formId,
    String fieldsJson,
    Integer version,
    Long updatedBy,
    OffsetDateTime updatedAt
) {
}
