package com.dataapp.form.interfaces.dto;

import java.util.Map;

public record FormPublishResponse(
    Long formId,
    String formCode,
    String name,
    String description,
    Long versionId,
    Integer versionNo,
    String status,
    Map<String, Object> fields
) {
}
