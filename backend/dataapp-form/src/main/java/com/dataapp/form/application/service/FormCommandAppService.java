package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.domain.model.valueobject.FormMeta;
import com.dataapp.form.domain.model.valueobject.FormSchema;
import com.dataapp.form.interfaces.dto.FormCreateResponse;
import com.dataapp.form.interfaces.dto.FormDraftResponse;
import com.dataapp.form.interfaces.dto.FormPublishResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.util.IdGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class FormCommandAppService {

    private final FormDefinitionRepository formDefinitionRepository;
    private final ObjectMapper objectMapper;

    public FormCommandAppService(
        FormDefinitionRepository formDefinitionRepository,
        ObjectMapper objectMapper
    ) {
        this.formDefinitionRepository = formDefinitionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public FormCreateResponse create(String name, String formCode) {
        long formId = IdGenerator.nextId();
        FormDefinition definition = FormDefinition.create(formId, formCode, new FormMeta(name, ""));
        formDefinitionRepository.save(definition);
        formDefinitionRepository.saveDraft(FormDraft.initialize(IdGenerator.nextId(), formId, 1L, OffsetDateTime.now()));
        return new FormCreateResponse(formId, definition.getFormCode());
    }

    @Transactional
    public FormDraftResponse saveDraft(Long formId, String name, String description, Map<String, Object> fields) {
        FormDefinition current = requireForm(formId);
        FormMeta meta = new FormMeta(name, description);
        FormSchema schema = FormSchema.forDraft(fields);
        String fieldsJson = writeFields(schema.fields());
        FormDraft currentDraft = formDefinitionRepository.findDraftByFormId(formId);
        FormDefinition.DraftSaveResult result = current.saveDraft(
            meta,
            currentDraft,
            fieldsJson,
            IdGenerator.nextId(),
            1L,
            OffsetDateTime.now()
        );

        formDefinitionRepository.update(result.formDefinition());
        formDefinitionRepository.saveDraft(result.draft());
        formDefinitionRepository.replaceDraftFields(formId, schema.fieldIndexes());

        return new FormDraftResponse(
            formId,
            current.getFormCode(),
            result.formDefinition().getName(),
            result.formDefinition().getDescription(),
            result.formDefinition().getStatus(),
            result.draft().getVersion(),
            schema.fields()
        );
    }

    @Transactional
    public FormPublishResponse publish(Long formId) {
        FormDefinition definition = requireForm(formId);
        FormDraft draft = formDefinitionRepository.findDraftByFormId(formId);
        if (draft == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单草稿不存在");
        }

        Map<String, Object> draftFields = readFields(draft.getFieldsJson());
        FormSchema schema = FormSchema.forPublish(draftFields);
        String fieldsJson = writeFields(schema.fields());
        int versionNo = formDefinitionRepository.nextVersionNo(formId);
        long versionId = IdGenerator.nextId();
        FormDefinition.PublishResult result = definition.publish(
            draft,
            fieldsJson,
            versionNo,
            versionId,
            1L,
            OffsetDateTime.now()
        );

        formDefinitionRepository.saveDraft(result.draft());
        formDefinitionRepository.replaceDraftFields(formId, schema.fieldIndexes());
        formDefinitionRepository.saveVersion(result.version());
        formDefinitionRepository.replaceVersionFields(versionId, formId, schema.fieldIndexes());
        formDefinitionRepository.updateCurrentVersion(formId, versionId, result.formDefinition().getStatus());

        return new FormPublishResponse(
            formId,
            result.formDefinition().getFormCode(),
            result.formDefinition().getName(),
            result.formDefinition().getDescription(),
            versionId,
            versionNo,
            result.formDefinition().getStatus(),
            schema.fields()
        );
    }

    @Transactional
    public void delete(Long formId) {
        requireForm(formId);
        formDefinitionRepository.deleteById(formId);
    }

    private FormDefinition requireForm(Long formId) {
        FormDefinition formDefinition = formDefinitionRepository.findById(formId);
        if (formDefinition == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单不存在");
        }
        return formDefinition;
    }

    private String writeFields(Map<String, Object> fields) {
        try {
            return objectMapper.writeValueAsString(fields);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.FORM_DRAFT_INVALID, "字段结构序列化失败");
        }
    }

    private Map<String, Object> readFields(String fieldsJson) {
        try {
            return objectMapper.readValue(fieldsJson, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.FORM_DRAFT_INVALID, "字段结构反序列化失败");
        }
    }
}
