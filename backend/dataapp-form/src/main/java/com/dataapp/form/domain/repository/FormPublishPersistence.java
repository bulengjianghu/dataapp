package com.dataapp.form.domain.repository;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormFieldIndex;
import com.dataapp.form.domain.model.entity.FormVersion;

import java.util.List;

public record FormPublishPersistence(
    FormDefinition formDefinition,
    FormDraft draft,
    FormVersion version,
    List<FormFieldIndex> fieldIndexes
) {
}
