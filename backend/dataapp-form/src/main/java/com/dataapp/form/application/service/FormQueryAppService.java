package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.interfaces.dto.FormDraftResponse;
import com.dataapp.form.interfaces.dto.FormDraftListItemResponse;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.form.interfaces.dto.FormRuntimeResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormQueryAppService {

    private final FormDefinitionRepository formDefinitionRepository;
    private final ObjectMapper objectMapper;

    public FormQueryAppService(FormDefinitionRepository formDefinitionRepository, ObjectMapper objectMapper) {
        this.formDefinitionRepository = formDefinitionRepository;
        this.objectMapper = objectMapper;
    }

    public FormDetailResponse getById(Long formId) {
        FormDefinition formDefinition = formDefinitionRepository.findById(formId);
        if (formDefinition == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单不存在");
        }
        return new FormDetailResponse(
            formDefinition.getId(),
            formDefinition.getFormCode(),
            formDefinition.getName(),
            formDefinition.getDescription(),
            formDefinition.getStatus(),
            formDefinition.getCurrentVersionId()
        );
    }

    public FormDraftResponse getDraft(Long formId) {
        FormDefinition formDefinition = formDefinitionRepository.findById(formId);
        if (formDefinition == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单不存在");
        }
        FormDraft draft = formDefinitionRepository.findDraftByFormId(formId);
        if (draft == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单草稿不存在");
        }
        return new FormDraftResponse(
            formDefinition.getId(),
            formDefinition.getFormCode(),
            formDefinition.getName(),
            formDefinition.getDescription(),
            formDefinition.getStatus(),
            draft.version(),
            readFields(draft.fieldsJson())
        );
    }

    public List<FormDraftListItemResponse> listDrafts() {
        return formDefinitionRepository.listDrafts().stream()
            .map(item -> new FormDraftListItemResponse(
                item.getFormId(),
                item.getFormCode(),
                item.getName(),
                item.getDescription(),
                item.getStatus(),
                item.getDraftVersion(),
                item.getUpdatedAt()
            ))
            .toList();
    }

    public FormRuntimeResponse getPublishedByFormCode(String formCode) {
        FormDefinition formDefinition = formDefinitionRepository.findByFormCode(formCode);
        if (formDefinition == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单不存在");
        }
        FormVersion formVersion = formDefinitionRepository.findCurrentVersionByFormCode(formCode);
        if (formVersion == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单尚未发布");
        }
        return new FormRuntimeResponse(
            formDefinition.getId(),
            formDefinition.getFormCode(),
            formDefinition.getName(),
            formDefinition.getDescription(),
            formVersion.id(),
            formVersion.versionNo(),
            readFields(formVersion.fieldsJson())
        );
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
