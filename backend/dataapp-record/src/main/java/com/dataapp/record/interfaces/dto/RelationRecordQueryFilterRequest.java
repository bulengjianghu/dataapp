package com.dataapp.record.interfaces.dto;

public record RelationRecordQueryFilterRequest(
    String fieldKey,
    String operator,
    Object value
) {
}
