package com.dataapp.form.domain.repository;

import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormFieldIndex;

import java.util.List;

public record FormDraftPersistence(
    FormDraft draft,
    List<FormFieldIndex> fieldIndexes
) {
}
