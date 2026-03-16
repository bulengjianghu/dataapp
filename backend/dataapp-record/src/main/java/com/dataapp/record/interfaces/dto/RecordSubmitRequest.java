package com.dataapp.record.interfaces.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record RecordSubmitRequest(
    @NotNull Map<String, Object> data
) {
}
