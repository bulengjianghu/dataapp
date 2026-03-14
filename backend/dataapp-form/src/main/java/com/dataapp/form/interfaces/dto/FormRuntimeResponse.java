package com.dataapp.form.interfaces.dto;

import java.util.Map;

public record FormRuntimeResponse(
    Long formId,
    String formCode,
    String name,
    String description,
    Long versionId,
    Integer versionNo,
    Map<String, Object> fields
) {
}
