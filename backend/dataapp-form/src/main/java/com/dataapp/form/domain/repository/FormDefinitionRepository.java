package com.dataapp.form.domain.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;

public interface FormDefinitionRepository {

    FormDefinition findById(Long id);

    void save(FormDefinition formDefinition);
}
