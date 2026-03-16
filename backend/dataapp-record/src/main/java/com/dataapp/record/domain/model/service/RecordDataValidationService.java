package com.dataapp.record.domain.model.service;

import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordData;
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
        return validate(schema, RecordData.of(data), false);
    }

    public ValidationResult validateForSubmit(PublishedFormSchema schema, Map<String, Object> data) {
        return validate(schema, RecordData.of(data), true);
    }

    private ValidationResult validate(PublishedFormSchema schema, RecordData data, boolean requireMandatoryFields) {
        List<ValidationIssue> issues = new ArrayList<>();
        validateMainData(schema, data.mainData(), issues, requireMandatoryFields);
        validateDetailTables(schema, data.detailTables(), issues, requireMandatoryFields);
        return new ValidationResult(issues);
    }

    private void validateMainData(
        PublishedFormSchema schema,
        Map<String, Object> mainData,
        List<ValidationIssue> issues,
        boolean requireMandatoryFields
    ) {
        Map<String, Object> values = mainData == null ? Map.of() : mainData;

        for (Map.Entry<String, Object> entry : values.entrySet()) {
            RecordFieldSchema fieldSchema = schema.mainFields().get(entry.getKey());
            if (fieldSchema == null) {
                issues.add(new ValidationIssue(entry.getKey(), "字段不存在于主表结构中"));
                continue;
            }
            validateValue(fieldSchema, entry.getValue(), issues, entry.getKey());
        }

        if (requireMandatoryFields) {
            for (RecordFieldSchema fieldSchema : schema.mainFields().values()) {
                if (fieldSchema.required() && isEmpty(values.get(fieldSchema.fieldKey()))) {
                    issues.add(new ValidationIssue(fieldSchema.fieldKey(), "必填字段不能为空"));
                }
            }
        }
    }

    private void validateDetailTables(
        PublishedFormSchema schema,
        Map<String, List<Map<String, Object>>> detailTables,
        List<ValidationIssue> issues,
        boolean requireMandatoryFields
    ) {
        Map<String, List<Map<String, Object>>> details = detailTables == null ? Map.of() : detailTables;

        for (Map.Entry<String, List<Map<String, Object>>> entry : details.entrySet()) {
            RecordFieldSchema detailTableSchema = schema.detailTables().get(entry.getKey());
            if (detailTableSchema == null) {
                issues.add(new ValidationIssue(entry.getKey(), "明细表不存在于表单版本中"));
                continue;
            }
            validateDetailRows(detailTableSchema, schema.detailFields(entry.getKey()), entry.getValue(), issues, requireMandatoryFields);
        }

        if (requireMandatoryFields) {
            for (RecordFieldSchema detailTableSchema : schema.detailTables().values()) {
                List<Map<String, Object>> rows = details.getOrDefault(detailTableSchema.fieldKey(), List.of());
                int rowCount = rows == null ? 0 : rows.size();
                if (detailTableSchema.minRows() != null && rowCount < detailTableSchema.minRows()) {
                    issues.add(new ValidationIssue(detailTableSchema.fieldKey(), "明细表行数少于最小限制"));
                }
                if (detailTableSchema.maxRows() != null && rowCount > detailTableSchema.maxRows()) {
                    issues.add(new ValidationIssue(detailTableSchema.fieldKey(), "明细表行数超过最大限制"));
                }
            }
        } else {
            for (RecordFieldSchema detailTableSchema : schema.detailTables().values()) {
                List<Map<String, Object>> rows = details.get(detailTableSchema.fieldKey());
                if (rows != null && detailTableSchema.maxRows() != null && rows.size() > detailTableSchema.maxRows()) {
                    issues.add(new ValidationIssue(detailTableSchema.fieldKey(), "明细表行数超过最大限制"));
                }
            }
        }
    }

    private void validateDetailRows(
        RecordFieldSchema detailTableSchema,
        Map<String, RecordFieldSchema> rowSchema,
        List<Map<String, Object>> rows,
        List<ValidationIssue> issues,
        boolean requireMandatoryFields
    ) {
        List<Map<String, Object>> detailRows = rows == null ? List.of() : rows;
        for (int i = 0; i < detailRows.size(); i++) {
            Map<String, Object> row = detailRows.get(i) == null ? Map.of() : detailRows.get(i);
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                RecordFieldSchema fieldSchema = rowSchema.get(entry.getKey());
                String path = detailTableSchema.fieldKey() + "[" + i + "]." + entry.getKey();
                if (fieldSchema == null) {
                    issues.add(new ValidationIssue(path, "字段不存在于明细表结构中"));
                    continue;
                }
                validateValue(fieldSchema, entry.getValue(), issues, path);
            }

            if (requireMandatoryFields) {
                for (RecordFieldSchema fieldSchema : rowSchema.values()) {
                    if (fieldSchema.required() && isEmpty(row.get(fieldSchema.fieldKey()))) {
                        issues.add(new ValidationIssue(
                            detailTableSchema.fieldKey() + "[" + i + "]." + fieldSchema.fieldKey(),
                            "必填字段不能为空"
                        ));
                    }
                }
            }
        }
    }

    private void validateValue(
        RecordFieldSchema fieldSchema,
        Object value,
        List<ValidationIssue> issues,
        String fieldPath
    ) {
        if (value == null || isEmpty(value)) {
            return;
        }
        switch (fieldSchema.componentType()) {
            case "input", "textarea" -> {
                if (!(value instanceof String)) {
                    issues.add(new ValidationIssue(fieldPath, "文本字段必须为字符串"));
                }
            }
            case "number" -> {
                if (!(value instanceof Number)) {
                    issues.add(new ValidationIssue(fieldPath, "数字字段必须为数值"));
                }
            }
            case "date" -> {
                if (!(value instanceof String stringValue)) {
                    issues.add(new ValidationIssue(fieldPath, "日期字段必须为字符串"));
                    return;
                }
                try {
                    LocalDate.parse(stringValue);
                } catch (DateTimeParseException ex) {
                    issues.add(new ValidationIssue(fieldPath, "日期格式非法"));
                }
            }
            case "radio", "select" -> {
                if (!(value instanceof String stringValue) || !fieldSchema.options().contains(stringValue)) {
                    issues.add(new ValidationIssue(fieldPath, "字段值不在允许选项中"));
                }
            }
            case "checkbox" -> {
                if (!(value instanceof Collection<?> collection)) {
                    issues.add(new ValidationIssue(fieldPath, "多选字段必须为数组"));
                    return;
                }
                for (Object item : collection) {
                    if (!(item instanceof String stringItem) || !fieldSchema.options().contains(stringItem)) {
                        issues.add(new ValidationIssue(fieldPath, "多选字段存在非法选项"));
                        return;
                    }
                }
            }
            case "upload" -> {
                if (!(value instanceof Collection<?>)) {
                    issues.add(new ValidationIssue(fieldPath, "附件字段必须为数组"));
                }
            }
            case "relation-select" -> {
                if (!(value instanceof String) && !(value instanceof Number)) {
                    issues.add(new ValidationIssue(fieldPath, "关联选择字段必须为记录标识"));
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
