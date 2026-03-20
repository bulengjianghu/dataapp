package com.dataapp.record.interfaces.dto;

import java.util.List;

public record RelationRecordQueryResponse(
    Long totalCount,
    List<RelationRecordOptionResponse> records
) {
}
