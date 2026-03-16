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
            for (Object rawNode : nodes.values()) {
                if (!(rawNode instanceof Map<?, ?> nodeMap)) {
                    continue;
                }
                if (!"field".equals(String.valueOf(nodeMap.get("type")))) {
                    continue;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> props = nodeMap.get("props") instanceof Map<?, ?> map
                    ? (Map<String, Object>) map
                    : Map.of();
                String fieldKey = stringValue(nodeMap.get("serverId"));
                if (fieldKey.isBlank()) {
                    continue;
                }
                fieldSchemas.add(new RecordFieldSchema(
                    fieldKey,
                    stringValue(props.get("label")),
                    stringValue(props.get("component")),
                    Boolean.TRUE.equals(props.get("required")),
                    parseOptions(props.get("options"))
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
}
