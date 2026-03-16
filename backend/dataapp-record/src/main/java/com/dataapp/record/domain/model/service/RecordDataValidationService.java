package com.dataapp.record.domain.model.service;

import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordFieldSchema;
import com.dataapp.record.domain.model.valueobject.ValidationIssue;
import com.dataapp.record.domain.model.valueobject.ValidationResult;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Component
public class RecordDataValidationService {

    public ValidationResult validateForDraft(PublishedFormSchema schema, Map<String, Object> data) {
        return validate(schema, data, false);
    }

    public ValidationResult validateForSubmit(PublishedFormSchema schema, Map<String, Object> data) {
        return validate(schema, data, true);
    }

    private ValidationResult validate(PublishedFormSchema schema, Map<String, Object> data, boolean requireMandatoryFields) {
        List<ValidationIssue> issues = new ArrayList<>();
        Map<String, Object> values = data == null ? Map.of() : data;

        for (Map.Entry<String, Object> entry : values.entrySet()) {
            RecordFieldSchema fieldSchema = schema.fields().get(entry.getKey());
            if (fieldSchema == null) {
                issues.add(new ValidationIssue(entry.getKey(), "字段不存在于表单版本中"));
                continue;
            }
            validateValue(fieldSchema, entry.getValue(), issues);
        }

        if (requireMandatoryFields) {
            for (RecordFieldSchema fieldSchema : schema.fields().values()) {
                Object value = values.get(fieldSchema.fieldKey());
                if (fieldSchema.required() && isEmpty(value)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "必填字段不能为空"));
                }
            }
        }

        return new ValidationResult(issues);
    }

    private void validateValue(RecordFieldSchema fieldSchema, Object value, List<ValidationIssue> issues) {
        if (value == null || isEmpty(value)) {
            return;
        }
        switch (fieldSchema.componentType()) {
            case "input", "textarea" -> {
                if (!(value instanceof String)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "文本字段必须为字符串"));
                }
            }
            case "number" -> {
                if (!(value instanceof Number)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "数字字段必须为数值"));
                }
            }
            case "date" -> {
                if (!(value instanceof String stringValue)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "日期字段必须为字符串"));
                    return;
                }
                try {
                    LocalDate.parse(stringValue);
                } catch (DateTimeParseException ex) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "日期格式非法"));
                }
            }
            case "radio", "select" -> {
                if (!(value instanceof String stringValue) || !fieldSchema.options().contains(stringValue)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "字段值不在允许选项中"));
                }
            }
            case "checkbox" -> {
                if (!(value instanceof Collection<?> collection)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "多选字段必须为数组"));
                    return;
                }
                for (Object item : collection) {
                    if (!(item instanceof String stringItem) || !fieldSchema.options().contains(stringItem)) {
                        issues.add(new ValidationIssue(fieldSchema.fieldKey(), "多选字段存在非法选项"));
                        return;
                    }
                }
            }
            case "upload" -> {
                if (!(value instanceof Collection<?>)) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "附件字段必须为数组"));
                }
            }
            default -> {
            }
        }
    }

    private boolean isEmpty(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String stringValue) {
            return stringValue.isBlank();
        }
        if (value instanceof Collection<?> collection) {
            return collection.isEmpty();
        }
        return false;
    }
}
