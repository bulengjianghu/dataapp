package com.dataapp.form.interfaces.dto;

public record FormDetailResponse(
    Long id,
    String formCode,
    String name,
    String description,
    String status,
    Long currentVersionId
) {
}
