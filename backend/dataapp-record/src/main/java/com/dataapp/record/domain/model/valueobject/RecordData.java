package com.dataapp.record.domain.model.valueobject;

import java.util.LinkedHashMap;
import java.util.Map;

public record RecordData(Map<String, Object> values) {

    public RecordData {
        values = values == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(values));
    }

    public static RecordData empty() {
        return new RecordData(Map.of());
    }

    public static RecordData of(Map<String, Object> values) {
        return new RecordData(values);
    }
}
