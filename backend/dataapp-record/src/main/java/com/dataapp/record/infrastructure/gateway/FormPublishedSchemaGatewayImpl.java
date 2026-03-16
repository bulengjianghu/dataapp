package com.dataapp.record.infrastructure.gateway;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordFieldSchema;
import com.dataapp.record.domain.repository.PublishedFormSchemaGateway;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class FormPublishedSchemaGatewayImpl implements PublishedFormSchemaGateway {

    private final FormDefinitionRepository formDefinitionRepository;
    private final ObjectMapper objectMapper;

    public FormPublishedSchemaGatewayImpl(FormDefinitionRepository formDefinitionRepository, ObjectMapper objectMapper) {
        this.formDefinitionRepository = formDefinitionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public PublishedFormSchema load(Long formId, Long formVersionId) {
        FormDefinition formDefinition = formDefinitionRepository.findById(formId);
        if (formDefinition == null) {
            return null;
        }
        FormVersion formVersion = formDefinitionRepository.findVersionById(formVersionId);
        if (formVersion == null || !formId.equals(formVersion.getFormId())) {
            return null;
        }
        return PublishedFormSchema.of(formId, formVersionId, parseFieldSchemas(formVersion.getFieldsJson()));
    }

    private List<RecordFieldSchema> parseFieldSchemas(String fieldsJson) {
        try {
            Map<String, Object> nodes = objectMapper.readValue(fieldsJson, new TypeReference<LinkedHashMap<String, Object>>() {
            });
            List<RecordFieldSchema> fieldSchemas = new ArrayList<>();
            Map<String, Map<String, Object>> normalizedNodes = new LinkedHashMap<>();
            for (Object rawNode : nodes.values()) {
                Map<String, Object> nodeMap = asNodeMap(rawNode);
                if (nodeMap == null) {
                    continue;
                }
                normalizedNodes.put(stringValue(nodeMap.get("id")), nodeMap);
            }

            for (Map<String, Object> nodeMap : normalizedNodes.values()) {
                String nodeType = stringValue(nodeMap.get("type"));
                Map<String, Object> props = props(nodeMap);
                String fieldKey = stringValue(nodeMap.get("serverId"));
                if (fieldKey.isBlank()) {
                    continue;
                }
                if ("detail_table".equals(nodeType) || "detail-table".equals(stringValue(props.get("component")))) {
                    fieldSchemas.add(RecordFieldSchema.detailTable(
                        fieldKey,
                        firstNonBlank(stringValue(props.get("title")), stringValue(props.get("label"))),
                        integerValue(props.get("minRows")),
                        integerValue(props.get("maxRows"))
                    ));
                    continue;
                }
                if (!"field".equals(nodeType)) {
                    continue;
                }

                String parentId = stringValue(nodeMap.get("parentId"));
                String detailTableKey = resolveDetailTableKey(normalizedNodes, parentId);
                if (!detailTableKey.isBlank()) {
                    fieldSchemas.add(new RecordFieldSchema(
                        fieldKey,
                        stringValue(props.get("label")),
                        stringValue(props.get("component")),
                        Boolean.TRUE.equals(props.get("required")),
                        parseOptions(props.get("options")),
                        "DETAIL",
                        detailTableKey,
                        null,
                        null,
                        null
                    ));
                    continue;
                }

                fieldSchemas.add(new RecordFieldSchema(
                    fieldKey,
                    stringValue(props.get("label")),
                    stringValue(props.get("component")),
                    Boolean.TRUE.equals(props.get("required")),
                    parseOptions(props.get("options")),
                    "MAIN",
                    null,
                    null,
                    null,
                    longValue(props.get("sourceFormId"))
                ));
            }
            return fieldSchemas;
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.FORM_DRAFT_INVALID, "发布版字段结构解析失败");
        }
    }

    private List<String> parseOptions(Object optionsValue) {
        List<String> options = new ArrayList<>();
        if (optionsValue instanceof Collection<?> collection) {
            for (Object item : collection) {
                if (item instanceof Map<?, ?> optionMap && optionMap.get("value") != null) {
                    options.add(String.valueOf(optionMap.get("value")));
                }
            }
        }
        return options;
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asNodeMap(Object rawNode) {
        if (!(rawNode instanceof Map<?, ?> nodeMap)) {
            return null;
        }
        return (Map<String, Object>) nodeMap;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> props(Map<String, Object> nodeMap) {
        return nodeMap.get("props") instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    private Integer integerValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long longValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String resolveDetailTableKey(Map<String, Map<String, Object>> nodes, String parentId) {
        if (parentId == null || parentId.isBlank()) {
            return "";
        }
        Map<String, Object> parentNode = nodes.get(parentId);
        if (parentNode == null) {
            return "";
        }
        Map<String, Object> parentProps = props(parentNode);
        if ("detail_table".equals(stringValue(parentNode.get("type"))) ||
            "detail-table".equals(stringValue(parentProps.get("component")))) {
            return stringValue(parentNode.get("serverId"));
        }
        return "";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }
}
