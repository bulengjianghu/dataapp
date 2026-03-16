package com.dataapp.form.domain.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.infrastructure.persistence.po.FormDraftSummaryPO;

import java.util.List;

public interface FormDefinitionRepository {

    FormDefinition findById(Long id);

    FormDefinition findByFormCode(String formCode);

    FormDraft findDraftByFormId(Long formId);

    List<FormDraftSummaryPO> listDrafts();

    FormVersion findCurrentVersionByFormCode(String formCode);

    FormVersion findVersionById(Long versionId);

    void save(FormDefinition formDefinition);

    void update(FormDefinition formDefinition);

    void saveDraftSnapshot(FormDraftPersistence draftPersistence);

    int nextVersionNo(Long formId);

    void savePublishedSnapshot(FormPublishPersistence publishPersistence);

    void deleteById(Long formId);
}
