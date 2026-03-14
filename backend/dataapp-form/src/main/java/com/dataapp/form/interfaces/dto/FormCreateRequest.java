package com.dataapp.form.interfaces.dto;

import jakarta.validation.constraints.NotBlank;

public record FormCreateRequest(
    @NotBlank String name,
    String formCode
) {
}
