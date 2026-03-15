package com.dataapp.form.domain.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormFieldIndex;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.infrastructure.persistence.po.FormDraftSummaryPO;

import java.util.List;

public interface FormDefinitionRepository {

    FormDefinition findById(Long id);

    FormDefinition findByFormCode(String formCode);

    FormDraft findDraftByFormId(Long formId);

    List<FormDraftSummaryPO> listDrafts();

    FormVersion findCurrentVersionByFormCode(String formCode);

    void save(FormDefinition formDefinition);

    void update(FormDefinition formDefinition);

    void saveDraft(FormDraft formDraft);

    void saveDraftSnapshot(FormDraftPersistence draftPersistence);

    int nextVersionNo(Long formId);

    void saveVersion(FormVersion formVersion);

    void updateCurrentVersion(Long formId, Long versionId, String status);

    void savePublishedSnapshot(FormPublishPersistence publishPersistence);

    void deleteById(Long formId);

    void replaceDraftFields(Long formId, List<FormFieldIndex> fields);

    void replaceVersionFields(Long formVersionId, Long formId, List<FormFieldIndex> fields);
}
