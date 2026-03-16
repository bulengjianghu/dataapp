package com.dataapp.record.domain.model.valueobject;

import java.util.List;

public record ValidationResult(
    List<ValidationIssue> issues
) {

    public ValidationResult {
        issues = issues == null ? List.of() : List.copyOf(issues);
    }

    public boolean isValid() {
        return issues.isEmpty();
    }
}
