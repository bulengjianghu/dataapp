package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class FormQueryAppService {

    private final FormDefinitionRepository formDefinitionRepository;

    public FormQueryAppService(FormDefinitionRepository formDefinitionRepository) {
        this.formDefinitionRepository = formDefinitionRepository;
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
            formDefinition.getStatus()
        );
    }
}
