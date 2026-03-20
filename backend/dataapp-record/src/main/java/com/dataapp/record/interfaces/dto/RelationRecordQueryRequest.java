package com.dataapp.record.interfaces.dto;

import java.util.List;

public record RelationRecordQueryRequest(
    String keyword,
    List<String> displayFields,
    List<RelationRecordQueryFilterRequest> filters,
    List<RelationRecordQuerySorterRequest> sorters,
    Integer pageNo,
    Integer pageSize
) {
}
