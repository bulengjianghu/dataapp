package com.dataapp.record.domain.model.valueobject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
}
