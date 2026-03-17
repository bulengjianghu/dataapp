package com.dataapp.record.interfaces.dto;

import java.util.List;
import java.util.Map;

public record RelationRecordOptionResponse(
    Long id,
    Long formId,
    Long formVersionId,
    String status,
    Map<String, Object> mainData,
    Map<String, List<Map<String, Object>>> detailTables
) {
}
