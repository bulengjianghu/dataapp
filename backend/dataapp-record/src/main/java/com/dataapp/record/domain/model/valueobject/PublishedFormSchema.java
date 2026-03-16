package com.dataapp.record.domain.model.valueobject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record PublishedFormSchema(
    Long formId,
    Long formVersionId,
    Map<String, RecordFieldSchema> fields
) {

    public PublishedFormSchema {
        fields = fields == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(fields));
    }

    public static PublishedFormSchema of(Long formId, Long formVersionId, List<RecordFieldSchema> fields) {
        LinkedHashMap<String, RecordFieldSchema> fieldMap = new LinkedHashMap<>();
        for (RecordFieldSchema field : fields) {
            fieldMap.put(field.fieldKey(), field);
        }
        return new PublishedFormSchema(formId, formVersionId, fieldMap);
    }

    public Map<String, RecordFieldSchema> mainFields() {
        return fields.values().stream()
            .filter(RecordFieldSchema::isMainField)
            .collect(Collectors.toMap(RecordFieldSchema::fieldKey, field -> field, (left, right) -> left, LinkedHashMap::new));
    }

    public Map<String, RecordFieldSchema> detailTables() {
        return fields.values().stream()
            .filter(RecordFieldSchema::isDetailTable)
            .collect(Collectors.toMap(RecordFieldSchema::fieldKey, field -> field, (left, right) -> left, LinkedHashMap::new));
    }

    public Map<String, RecordFieldSchema> detailFields(String detailTableKey) {
        return fields.values().stream()
            .filter(RecordFieldSchema::isDetailField)
            .filter(field -> detailTableKey.equals(field.detailTableKey()))
            .collect(Collectors.toMap(RecordFieldSchema::fieldKey, field -> field, (left, right) -> left, LinkedHashMap::new));
    }
}
