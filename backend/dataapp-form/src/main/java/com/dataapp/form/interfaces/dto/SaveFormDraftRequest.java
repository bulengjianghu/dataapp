package com.dataapp.form.interfaces.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SaveFormDraftRequest(
    @NotBlank String name,
    String description,
    @NotNull Map<String, Object> fields
) {
}
