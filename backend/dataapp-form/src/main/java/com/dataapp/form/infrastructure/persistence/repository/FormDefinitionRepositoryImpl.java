package com.dataapp.form.infrastructure.persistence.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormFieldIndex;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.infrastructure.persistence.converter.FormDefinitionConverter;
import com.dataapp.form.infrastructure.persistence.mapper.FormDefinitionMapper;
import com.dataapp.form.infrastructure.persistence.po.FormDefinitionPO;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.stereotype.Repository;

import java.util.List;

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
    public FormDefinition findByFormCode(String formCode) {
        return FormDefinitionConverter.toDomain(formDefinitionMapper.selectByFormCode(formCode));
    }

    @Override
    public FormDraft findDraftByFormId(Long formId) {
        var po = formDefinitionMapper.selectDraftByFormId(formId);
        return po == null ? null : new FormDraft(
            po.getId(),
            po.getFormId(),
            po.getFieldsJson(),
            po.getVersion(),
            po.getUpdatedBy(),
            po.getUpdatedAt()
        );
    }

    @Override
    public List<com.dataapp.form.infrastructure.persistence.po.FormDraftSummaryPO> listDrafts() {
        return formDefinitionMapper.selectDraftSummaries();
    }

    @Override
    public FormVersion findCurrentVersionByFormCode(String formCode) {
        var po = formDefinitionMapper.selectCurrentVersionByFormCode(formCode);
        return po == null ? null : new FormVersion(
            po.getId(),
            po.getFormId(),
            po.getVersionNo(),
            po.getFieldsJson(),
            po.getPublishedBy(),
            po.getPublishedAt()
        );
    }

    @Override
    public void save(FormDefinition formDefinition) {
        FormDefinitionPO po = new FormDefinitionPO();
        po.setId(formDefinition.getId());
        po.setTenantId(0L);
        po.setFormCode(formDefinition.getFormCode());
        po.setName(formDefinition.getName());
        po.setDescription(formDefinition.getDescription());
        po.setStatus(formDefinition.getStatus());
        formDefinitionMapper.insert(po);
    }

    @Override
    public void update(FormDefinition formDefinition) {
        FormDefinitionPO po = new FormDefinitionPO();
        po.setId(formDefinition.getId());
        po.setName(formDefinition.getName());
        po.setDescription(formDefinition.getDescription());
        po.setStatus(formDefinition.getStatus());
        formDefinitionMapper.update(po);
    }

    @Override
    public void saveDraft(FormDraft formDraft) {
        var po = new com.dataapp.form.infrastructure.persistence.po.FormDraftPO();
        po.setId(formDraft.id());
        po.setFormId(formDraft.formId());
        po.setFieldsJson(formDraft.fieldsJson());
        po.setVersion(formDraft.version());
        po.setUpdatedBy(formDraft.updatedBy());
        formDefinitionMapper.upsertDraft(po);
    }

    @Override
    public int nextVersionNo(Long formId) {
        return formDefinitionMapper.selectMaxVersionNo(formId) + 1;
    }

    @Override
    public void saveVersion(FormVersion formVersion) {
        var po = new com.dataapp.form.infrastructure.persistence.po.FormVersionPO();
        po.setId(formVersion.id());
        po.setFormId(formVersion.formId());
        po.setVersionNo(formVersion.versionNo());
        po.setFieldsJson(formVersion.fieldsJson());
        po.setPublishedBy(formVersion.publishedBy());
        formDefinitionMapper.insertVersion(po);
    }

    @Override
    public void updateCurrentVersion(Long formId, Long versionId, String status) {
        formDefinitionMapper.updateCurrentVersion(formId, versionId, status);
    }

    @Override
    public void deleteById(Long formId) {
        formDefinitionMapper.deleteVersionFieldsByFormId(formId);
        formDefinitionMapper.deleteDraftFieldsByFormId(formId);
        formDefinitionMapper.deleteVersionsByFormId(formId);
        formDefinitionMapper.deleteDraftByFormId(formId);
        formDefinitionMapper.deleteByFormId(formId);
    }

    @Override
    public void replaceDraftFields(Long formId, List<FormFieldIndex> fields) {
        formDefinitionMapper.deleteDraftFieldsByFormId(formId);
        for (FormFieldIndex field : fields) {
            formDefinitionMapper.insertDraftField(
                IdGenerator.nextId(),
                formId,
                field.fieldKey(),
                field.fieldCode(),
                field.fieldName(),
                field.nodeType(),
                field.componentType(),
                field.parentFieldKey(),
                field.sortNo(),
                "ACTIVE"
            );
        }
    }

    @Override
    public void replaceVersionFields(Long formVersionId, Long formId, List<FormFieldIndex> fields) {
        formDefinitionMapper.deleteVersionFieldsByVersionId(formVersionId);
        for (FormFieldIndex field : fields) {
            formDefinitionMapper.insertVersionField(
                IdGenerator.nextId(),
                formVersionId,
                formId,
                field.fieldKey(),
                field.fieldCode(),
                field.fieldName(),
                field.nodeType(),
                field.componentType(),
                field.parentFieldKey(),
                field.sortNo()
            );
        }
    }
}
