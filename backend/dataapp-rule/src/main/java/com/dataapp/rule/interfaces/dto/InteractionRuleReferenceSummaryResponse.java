package com.dataapp.rule.interfaces.dto;

import java.util.List;

public record InteractionRuleReferenceSummaryResponse(
    List<String> fields,
    List<String> detailTables,
    List<String> forms,
    List<String> events
) {
}
