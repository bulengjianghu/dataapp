package com.dataapp.form.interfaces.dto;

import java.time.OffsetDateTime;

public record FormDraftListItemResponse(
    Long formId,
    String formCode,
    String name,
    String description,
    String status,
    Integer draftVersion,
    OffsetDateTime updatedAt
) {
}
