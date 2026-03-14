package com.dataapp.form.infrastructure.persistence.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.infrastructure.persistence.converter.FormDefinitionConverter;
import com.dataapp.form.infrastructure.persistence.mapper.FormDefinitionMapper;
import com.dataapp.form.infrastructure.persistence.po.FormDefinitionPO;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.stereotype.Repository;

@Repository
public class FormDefinitionRepositoryImpl implements FormDefinitionRepository {

    private final FormDefinitionMapper formDefinitionMapper;

    public FormDefinitionRepositoryImpl(FormDefinitionMapper formDefinitionMapper) {
        this.formDefinitionMapper = formDefinitionMapper;
    }

    @Override
    public FormDefinition findById(Long id) {
        return FormDefinitionConverter.toDomain(formDefinitionMapper.selectById(id));
    }

    @Override
    public void save(FormDefinition formDefinition) {
        FormDefinitionPO po = new FormDefinitionPO();
        po.setId(formDefinition.getId());
        po.setTenantId(0L);
        po.setFormCode(formDefinition.getFormCode());
        po.setName(formDefinition.getName());
        po.setStatus(formDefinition.getStatus());
        formDefinitionMapper.insert(po);
        formDefinitionMapper.insertDraft(IdGenerator.nextId(), 0L, formDefinition.getId(), "{\"fields\":[]}");
    }
}
