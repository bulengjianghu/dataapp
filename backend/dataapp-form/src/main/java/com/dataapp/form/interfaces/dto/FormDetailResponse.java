package com.dataapp.form.interfaces.dto;

public record FormDetailResponse(
    Long id,
    String formCode,
    String name,
    String status
) {
}
