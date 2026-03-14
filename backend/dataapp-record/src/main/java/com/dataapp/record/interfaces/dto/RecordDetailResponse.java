package com.dataapp.record.interfaces.dto;

public record RecordDetailResponse(
    Long id,
    Long formId,
    Long formVersionId,
    String status
) {
}
