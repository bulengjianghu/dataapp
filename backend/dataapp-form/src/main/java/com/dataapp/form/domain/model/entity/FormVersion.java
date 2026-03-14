package com.dataapp.form.domain.model.entity;

import java.time.OffsetDateTime;

public record FormVersion(
    Long id,
    Long formId,
    Integer versionNo,
    String fieldsJson,
    Long publishedBy,
    OffsetDateTime publishedAt
) {
}
