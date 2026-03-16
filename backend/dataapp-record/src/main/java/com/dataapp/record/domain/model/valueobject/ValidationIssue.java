package com.dataapp.record.domain.model.valueobject;

public record ValidationIssue(
    String fieldKey,
    String message
) {
}
