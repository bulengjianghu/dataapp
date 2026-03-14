package com.dataapp.form.interfaces.dto;

import java.util.Map;

public record FormDraftResponse(
    Long formId,
    String formCode,
    String name,
    String description,
    String status,
    Integer draftVersion,
    Map<String, Object> fields
) {
}
