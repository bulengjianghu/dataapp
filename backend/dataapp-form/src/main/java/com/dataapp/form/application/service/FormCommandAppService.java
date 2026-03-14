package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
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
    private final FormSchemaNormalizer formSchemaNormalizer;
    private final ObjectMapper objectMapper;

    public FormCommandAppService(
        FormDefinitionRepository formDefinitionRepository,
        FormSchemaNormalizer formSchemaNormalizer,
        ObjectMapper objectMapper
    ) {
        this.formDefinitionRepository = formDefinitionRepository;
        this.formSchemaNormalizer = formSchemaNormalizer;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public FormCreateResponse create(String name, String formCode) {
        long formId = IdGenerator.nextId();
        String resolvedFormCode = (formCode == null || formCode.isBlank()) ? "form_" + formId : formCode.trim();
        formDefinitionRepository.save(new FormDefinition(formId, resolvedFormCode, name, "", "DRAFT", null));
        formDefinitionRepository.saveDraft(new FormDraft(
            IdGenerator.nextId(),
            formId,
            "{}",
            0,
            1L,
            OffsetDateTime.now()
        ));
        return new FormCreateResponse(formId, resolvedFormCode);
    }

    @Transactional
    public FormDraftResponse saveDraft(Long formId, String name, String description, Map<String, Object> fields) {
        FormDefinition current = requireForm(formId);
        FormSchemaNormalizer.NormalizedSchema normalizedSchema = formSchemaNormalizer.normalizeForDraft(fields);
        String normalizedDescription = description == null ? "" : description;
        String fieldsJson = writeFields(normalizedSchema.fields());
        FormDraft currentDraft = formDefinitionRepository.findDraftByFormId(formId);
        int nextVersion = currentDraft == null ? 1 : currentDraft.version() + 1;

        formDefinitionRepository.update(new FormDefinition(
            current.getId(),
            current.getFormCode(),
            name,
            normalizedDescription,
            "DRAFT",
            current.getCurrentVersionId()
        ));
        formDefinitionRepository.saveDraft(new FormDraft(
            currentDraft == null ? IdGenerator.nextId() : currentDraft.id(),
            formId,
            fieldsJson,
            nextVersion,
            1L,
            OffsetDateTime.now()
        ));
        formDefinitionRepository.replaceDraftFields(formId, normalizedSchema.fieldIndexes());

        return new FormDraftResponse(
            formId,
            current.getFormCode(),
            name,
            normalizedDescription,
            "DRAFT",
            nextVersion,
            normalizedSchema.fields()
        );
    }

    @Transactional
    public FormPublishResponse publish(Long formId) {
        FormDefinition definition = requireForm(formId);
        FormDraft draft = formDefinitionRepository.findDraftByFormId(formId);
        if (draft == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单草稿不存在");
        }

        Map<String, Object> draftFields = readFields(draft.fieldsJson());
        FormSchemaNormalizer.NormalizedSchema normalizedSchema = formSchemaNormalizer.normalizeForPublish(draftFields);
        String fieldsJson = writeFields(normalizedSchema.fields());
        int versionNo = formDefinitionRepository.nextVersionNo(formId);
        long versionId = IdGenerator.nextId();

        formDefinitionRepository.saveDraft(new FormDraft(
            draft.id(),
            draft.formId(),
            fieldsJson,
            draft.version(),
            1L,
            OffsetDateTime.now()
        ));
        formDefinitionRepository.replaceDraftFields(formId, normalizedSchema.fieldIndexes());
        formDefinitionRepository.saveVersion(new FormVersion(
            versionId,
            formId,
            versionNo,
            fieldsJson,
            1L,
            OffsetDateTime.now()
        ));
        formDefinitionRepository.replaceVersionFields(versionId, formId, normalizedSchema.fieldIndexes());
        formDefinitionRepository.updateCurrentVersion(formId, versionId, "ACTIVE");

        return new FormPublishResponse(
            formId,
            definition.getFormCode(),
            definition.getName(),
            definition.getDescription(),
            versionId,
            versionNo,
            "ACTIVE",
            normalizedSchema.fields()
        );
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
