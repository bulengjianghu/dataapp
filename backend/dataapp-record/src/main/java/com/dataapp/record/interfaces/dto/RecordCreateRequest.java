package com.dataapp.record.interfaces.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordCreateRequest(
    @NotNull Long formId,
    @NotNull Long formVersionId,
    @NotBlank String dataJson
) {
}
