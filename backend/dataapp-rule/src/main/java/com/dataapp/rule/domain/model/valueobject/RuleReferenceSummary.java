package com.dataapp.rule.domain.model.valueobject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record RuleReferenceSummary(
    List<String> fields,
    List<String> detailTables,
    List<String> forms,
    List<String> events
) {

    public static RuleReferenceSummary empty() {
        return new RuleReferenceSummary(List.of(), List.of(), List.of(), List.of());
    }

    public Map<String, Object> toMap() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("fields", fields);
        payload.put("detailTables", detailTables);
        payload.put("forms", forms);
        payload.put("events", events);
        return payload;
    }
}
