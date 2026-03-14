package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.stereotype.Service;

@Service
public class FormCommandAppService {

    private final FormDefinitionRepository formDefinitionRepository;

    public FormCommandAppService(FormDefinitionRepository formDefinitionRepository) {
        this.formDefinitionRepository = formDefinitionRepository;
    }

    public String create(String name, String formCode) {
        long formId = IdGenerator.nextId();
        formDefinitionRepository.save(new FormDefinition(formId, formCode, name, "DRAFT"));
        return String.valueOf(formId);
    }
}
