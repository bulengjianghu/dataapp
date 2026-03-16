package com.dataapp.record.domain.model.valueobject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record RecordData(
    Map<String, Object> mainData,
    Map<String, List<Map<String, Object>>> detailTables
) {

    public RecordData {
        mainData = immutableMap(mainData);
        detailTables = immutableDetailTables(detailTables);
    }

    public static RecordData empty() {
        return new RecordData(Map.of(), Map.of());
    }

    @SuppressWarnings("unchecked")
    public static RecordData of(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return empty();
        }

        Object mainData = values.get("mainData");
        Object detailTables = values.get("detailTables");
        if (mainData == null && detailTables == null) {
            return new RecordData(values, Map.of());
        }

        return new RecordData(
            mainData instanceof Map<?, ?> mainMap ? (Map<String, Object>) mainMap : Map.of(),
            detailTables instanceof Map<?, ?> detailMap ? toDetailTables((Map<?, ?>) detailMap) : Map.of()
        );
    }

    public Map<String, Object> toMap() {
        LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
        payload.put("mainData", mainData);
        payload.put("detailTables", detailTables);
        return Map.copyOf(payload);
    }

    private static Map<String, Object> immutableMap(Map<String, Object> source) {
        return source == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(source));
    }

    private static Map<String, List<Map<String, Object>>> immutableDetailTables(Map<String, List<Map<String, Object>>> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }

        LinkedHashMap<String, List<Map<String, Object>>> detailTables = new LinkedHashMap<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : source.entrySet()) {
            List<Map<String, Object>> rows = new ArrayList<>();
            if (entry.getValue() != null) {
                for (Map<String, Object> row : entry.getValue()) {
                    rows.add(immutableMap(row));
                }
            }
            detailTables.put(entry.getKey(), List.copyOf(rows));
        }
        return Map.copyOf(detailTables);
    }

    private static Map<String, List<Map<String, Object>>> toDetailTables(Map<?, ?> source) {
        LinkedHashMap<String, List<Map<String, Object>>> detailTables = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            List<Map<String, Object>> rows = new ArrayList<>();
            if (entry.getValue() instanceof List<?> rowList) {
                for (Object row : rowList) {
                    if (row instanceof Map<?, ?> rowMap) {
                        LinkedHashMap<String, Object> normalizedRow = new LinkedHashMap<>();
                        for (Map.Entry<?, ?> rowEntry : rowMap.entrySet()) {
                            normalizedRow.put(String.valueOf(rowEntry.getKey()), rowEntry.getValue());
                        }
                        rows.add(Map.copyOf(normalizedRow));
                    }
                }
            }
            detailTables.put(String.valueOf(entry.getKey()), List.copyOf(rows));
        }
        return Map.copyOf(detailTables);
    }
}
