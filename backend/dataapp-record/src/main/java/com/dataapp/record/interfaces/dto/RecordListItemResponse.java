package com.dataapp.record.interfaces.dto;

public record RecordListItemResponse(
    Long id,
    Long formId,
    Long formVersionId,
    String status,
    Long creatorId
) {
}
