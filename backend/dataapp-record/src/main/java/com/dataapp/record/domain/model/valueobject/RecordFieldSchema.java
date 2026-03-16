package com.dataapp.record.domain.model.valueobject;

import java.util.List;

public record RecordFieldSchema(
    String fieldKey,
    String fieldName,
    String componentType,
    boolean required,
    List<String> options
) {

    public RecordFieldSchema {
        options = options == null ? List.of() : List.copyOf(options);
    }

    public static RecordFieldSchema text(String fieldKey, String fieldName, boolean required) {
        return new RecordFieldSchema(fieldKey, fieldName, "input", required, List.of());
    }

    public static RecordFieldSchema singleSelect(String fieldKey, String fieldName, boolean required, List<String> options) {
        return new RecordFieldSchema(fieldKey, fieldName, "radio", required, options);
    }

    public static RecordFieldSchema multiSelect(String fieldKey, String fieldName, boolean required, List<String> options) {
        return new RecordFieldSchema(fieldKey, fieldName, "checkbox", required, options);
    }
}
