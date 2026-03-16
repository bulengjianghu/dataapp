package com.dataapp.record.interfaces.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public record RecordCreateRequest(
    @NotNull Long formId,
    @NotNull Long formVersionId,
    @NotNull Map<String, Object> mainData,
    @NotNull Map<String, List<Map<String, Object>>> detailTables
) {
}
