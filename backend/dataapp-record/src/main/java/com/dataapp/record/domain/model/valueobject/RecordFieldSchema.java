package com.dataapp.record.domain.model.valueobject;

import java.util.List;

public record RecordFieldSchema(
    String fieldKey,
    String fieldName,
    String componentType,
    boolean required,
    List<String> options,
    String scopeType,
    String detailTableKey,
    Integer minRows,
    Integer maxRows,
    Long sourceFormId
) {

    public RecordFieldSchema {
        options = options == null ? List.of() : List.copyOf(options);
    }

    public static RecordFieldSchema text(String fieldKey, String fieldName, boolean required) {
        return new RecordFieldSchema(fieldKey, fieldName, "input", required, List.of(), "MAIN", null, null, null, null);
    }

    public static RecordFieldSchema singleSelect(String fieldKey, String fieldName, boolean required, List<String> options) {
        return new RecordFieldSchema(fieldKey, fieldName, "radio", required, options, "MAIN", null, null, null, null);
    }

    public static RecordFieldSchema multiSelect(String fieldKey, String fieldName, boolean required, List<String> options) {
        return new RecordFieldSchema(fieldKey, fieldName, "checkbox", required, options, "MAIN", null, null, null, null);
    }

    public static RecordFieldSchema relationSelect(String fieldKey, String fieldName, boolean required, Long sourceFormId) {
        return new RecordFieldSchema(fieldKey, fieldName, "relation-select", required, List.of(), "MAIN", null, null, null, sourceFormId);
    }

    public static RecordFieldSchema detailTable(String fieldKey, String fieldName, Integer minRows, Integer maxRows) {
        return new RecordFieldSchema(fieldKey, fieldName, "detail-table", false, List.of(), "DETAIL_TABLE", fieldKey, minRows, maxRows, null);
    }

    public static RecordFieldSchema detailText(String fieldKey, String fieldName, String detailTableKey, boolean required) {
        return new RecordFieldSchema(fieldKey, fieldName, "input", required, List.of(), "DETAIL", detailTableKey, null, null, null);
    }

    public static RecordFieldSchema detailNumber(String fieldKey, String fieldName, String detailTableKey, boolean required) {
        return new RecordFieldSchema(fieldKey, fieldName, "number", required, List.of(), "DETAIL", detailTableKey, null, null, null);
    }

    public boolean isDetailTable() {
        return "DETAIL_TABLE".equals(scopeType);
    }

    public boolean isDetailField() {
        return "DETAIL".equals(scopeType);
    }

    public boolean isMainField() {
        return "MAIN".equals(scopeType);
    }
}
